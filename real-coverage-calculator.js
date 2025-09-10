#!/usr/bin/env node

/**
 * Real Integration Test Coverage Calculator
 * Analyzes the manually assessed coverage CSV to provide accurate metrics
 */

const fs = require('fs');

console.log('📊 REAL Integration Test Coverage Analysis');
console.log('='.repeat(60));

function parseCSV() {
  const csvContent = fs.readFileSync('./integration-test-coverage-analysis.csv', 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  const components = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const component = {};
        headers.forEach((header, index) => {
          component[header] = values[index];
        });
        components.push(component);
      }
    }
  }
  
  return components;
}

function analyzeCoverage() {
  console.log('🔍 Reading manually assessed coverage data...\n');
  
  const components = parseCSV();
  
  // Coverage categories
  const categories = {
    'Core': [],
    'Asset Management': [],
    'Settings': [],
    'Connections': [],
    'Lineage': [],
    'Query': [],
    'UI Components': []
  };
  
  // Group by category
  components.forEach(comp => {
    if (categories[comp.Category]) {
      categories[comp.Category].push(comp);
    }
  });
  
  console.log('📋 DETAILED COVERAGE ANALYSIS BY CATEGORY:');
  console.log('='.repeat(50));
  
  let totalComponents = 0;
  let totalCoverageWeighted = 0;
  
  Object.keys(categories).forEach(category => {
    const comps = categories[category];
    if (comps.length === 0) return;
    
    totalComponents += comps.length;
    
    let categoryTotal = 0;
    let categoryWeightedCoverage = 0;
    
    console.log(`\n🗂️  ${category.toUpperCase()} (${comps.length} components):`);
    
    const tested = comps.filter(c => c.Integration_Test_Coverage === 'YES').length;
    const partial = comps.filter(c => c.Integration_Test_Coverage === 'PARTIAL').length;
    const indirect = comps.filter(c => c.Integration_Test_Coverage === 'INDIRECT').length;
    const untested = comps.filter(c => c.Integration_Test_Coverage === 'NO').length;
    
    console.log(`   ✅ Fully Tested: ${tested}`);
    console.log(`   🟡 Partially Tested: ${partial}`);
    console.log(`   🔗 Indirectly Tested: ${indirect}`);
    console.log(`   ❌ Not Tested: ${untested}`);
    
    comps.forEach(comp => {
      const coverage = parseInt(comp.Coverage_Percentage.replace('%', '')) || 0;
      categoryWeightedCoverage += coverage;
      
      const status = comp.Integration_Test_Coverage === 'YES' ? '✅' :
                    comp.Integration_Test_Coverage === 'PARTIAL' ? '🟡' :
                    comp.Integration_Test_Coverage === 'INDIRECT' ? '🔗' : '❌';
      
      console.log(`     ${status} ${comp.Component.padEnd(25)} ${comp.Coverage_Percentage.padStart(4)} - ${comp.Risk_Level}`);
    });
    
    const avgCategoryCoverage = Math.round(categoryWeightedCoverage / comps.length);
    console.log(`   📊 Category Average: ${avgCategoryCoverage}%`);
    
    totalCoverageWeighted += categoryWeightedCoverage;
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 OVERALL INTEGRATION TEST COVERAGE SUMMARY:');
  console.log('='.repeat(50));
  
  const overallAverage = Math.round(totalCoverageWeighted / totalComponents);
  
  console.log(`📊 Total Components Analyzed: ${totalComponents}`);
  console.log(`🎯 Weighted Average Coverage: ${overallAverage}%`);
  
  // Risk assessment
  const highRisk = components.filter(c => c.Risk_Level === 'HIGH').length;
  const mediumRisk = components.filter(c => c.Risk_Level === 'MEDIUM').length;
  const lowRisk = components.filter(c => c.Risk_Level === 'LOW').length;
  
  console.log('\n🚨 RISK ASSESSMENT:');
  console.log(`   🔴 High Risk (Untested Critical Features): ${highRisk} components`);
  console.log(`   🟡 Medium Risk (Partially Tested): ${mediumRisk} components`);
  console.log(`   🟢 Low Risk (Well Tested): ${lowRisk} components`);
  
  // Coverage by test type
  const fullTested = components.filter(c => c.Integration_Test_Coverage === 'YES').length;
  const partialTested = components.filter(c => c.Integration_Test_Coverage === 'PARTIAL').length;
  const indirectTested = components.filter(c => c.Integration_Test_Coverage === 'INDIRECT').length;
  const untested = components.filter(c => c.Integration_Test_Coverage === 'NO').length;
  
  console.log('\n📈 COVERAGE BREAKDOWN:');
  const fullCoverage = Math.round((fullTested / totalComponents) * 100);
  const partialCoverage = Math.round((partialTested / totalComponents) * 100);
  const indirectCoverage = Math.round((indirectTested / totalComponents) * 100);
  const noCoverage = Math.round((untested / totalComponents) * 100);
  
  console.log(`   ✅ Full Integration Testing: ${fullCoverage}% (${fullTested}/${totalComponents})`);
  console.log(`   🟡 Partial Testing: ${partialCoverage}% (${partialTested}/${totalComponents})`);
  console.log(`   🔗 Indirect Testing: ${indirectCoverage}% (${indirectTested}/${totalComponents})`);
  console.log(`   ❌ No Testing: ${noCoverage}% (${untested}/${totalComponents})`);
  
  const someCoverage = Math.round(((fullTested + partialTested + indirectTested) / totalComponents) * 100);
  console.log(`\n🎯 Components with Some Testing: ${someCoverage}%`);
  
  console.log('\n💡 KEY FINDINGS:');
  if (overallAverage >= 60) {
    console.log('   🟢 GOOD: Integration test coverage is comprehensive');
  } else if (overallAverage >= 40) {
    console.log('   🟡 MODERATE: Integration test coverage covers core workflows');
  } else {
    console.log('   🔴 NEEDS IMPROVEMENT: Integration test coverage has significant gaps');
  }
  
  console.log('\n📋 HIGH-PRIORITY UNTESTED COMPONENTS:');
  const criticalUntested = components.filter(c => 
    c.Risk_Level === 'HIGH' && c.Integration_Test_Coverage === 'NO'
  );
  
  criticalUntested.forEach(comp => {
    console.log(`   🚨 ${comp.Component} - ${comp.Functionality}`);
  });
  
  console.log('\n🎯 CONCLUSION:');
  console.log(`   • Real measured coverage: ${overallAverage}%`);
  console.log(`   • Previous heuristic estimate: 38%`);
  console.log(`   • Difference: ${overallAverage - 38}% ${overallAverage > 38 ? 'higher' : 'lower'} than estimated`);
  console.log(`   • ${highRisk} critical components need integration testing`);
  console.log(`   • Focus areas: Lineage visualization, Query functionality, Connection management`);
}

try {
  analyzeCoverage();
} catch (error) {
  console.error('❌ Error analyzing coverage:', error.message);
  console.log('\n📋 Make sure integration-test-coverage-analysis.csv exists in the current directory');
}