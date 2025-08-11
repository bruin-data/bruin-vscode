import { provideVSCodeDesignSystem, vsCodeButton, vsCodeDivider, vsCodeDropdown, vsCodeOption, vsCodeProgressRing, vsCodeTextArea, vsCodeTextField } from "@vscode/webview-ui-toolkit";

// Register the toolkit components
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDivider(),
  vsCodeDropdown(),
  vsCodeOption(),
  vsCodeProgressRing(),
  vsCodeTextArea(),
  vsCodeTextField()
);

// Get access to the VS Code API
const vscode = acquireVsCodeApi();

// Add some basic styles for the table diff UI
const styles = `
<style>
  .table-diff-container {
    padding: 16px;
  }
  
  .header {
    margin-bottom: 20px;
  }
  
  .header h2 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }
  
  .header p {
    margin: 0;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
  }
  
  .diff-controls {
    margin-bottom: 24px;
  }
  
  .table-selection {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 16px;
  }
  
  .source-table, .target-table {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 16px;
  }
  
  .source-table h3, .target-table h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .source-table vscode-dropdown, .target-table vscode-dropdown {
    width: 100%;
    margin-bottom: 8px;
  }
  
  .diff-options {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .diff-results {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 16px;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
  }
  
  .loading-container p {
    margin: 16px 0 0 0;
    color: var(--vscode-descriptionForeground);
  }
  
  .diff-summary {
    padding: 16px;
  }
  
  .diff-summary h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .error-message {
    padding: 16px;
    background: var(--vscode-errorBackground);
    border-radius: 4px;
  }
  
  .error-message h3 {
    margin: 0 0 8px 0;
    color: var(--vscode-errorForeground);
  }
  
  .error-message p {
    margin: 0;
    color: var(--vscode-errorForeground);
  }
</style>
`;

// Main application class
class TableDiffApp {
  private isLoading = false;

  constructor() {
    this.initialize();
    this.setupEventListeners();
    this.setupMessageListener();
  }

  private initialize() {
    const app = document.getElementById('app');
    if (!app) return;

    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', styles);

    app.innerHTML = `
      <div class="table-diff-container">
        <div class="header">
          <h2>Table Diff</h2>
          <p>Compare tables across environments or connections</p>
        </div>
        
        <div class="diff-controls">
          <div class="table-selection">
            <div class="source-table">
              <h3>Source Table</h3>
              <vscode-dropdown id="source-connection">
                <vscode-option>Select connection...</vscode-option>
              </vscode-dropdown>
              <vscode-dropdown id="source-schema">
                <vscode-option>Select schema...</vscode-option>
              </vscode-dropdown>
              <vscode-dropdown id="source-table">
                <vscode-option>Select table...</vscode-option>
              </vscode-dropdown>
            </div>
            
            <div class="target-table">
              <h3>Target Table</h3>
              <vscode-dropdown id="target-connection">
                <vscode-option>Select connection...</vscode-option>
              </vscode-dropdown>
              <vscode-dropdown id="target-schema">
                <vscode-option>Select schema...</vscode-option>
              </vscode-dropdown>
              <vscode-dropdown id="target-table">
                <vscode-option>Select table...</vscode-option>
              </vscode-dropdown>
            </div>
          </div>
          
          <div class="diff-options">
            <vscode-button id="compare-btn" disabled>Compare Tables</vscode-button>
            <vscode-button id="clear-btn" appearance="secondary">Clear</vscode-button>
          </div>
        </div>
        
        <div class="diff-results" id="diff-results" style="display: none;">
          <div class="loading-container" id="loading-container" style="display: none;">
            <vscode-progress-ring></vscode-progress-ring>
            <p>Comparing tables...</p>
          </div>
          
          <div class="results-container" id="results-container">
            <!-- Diff results will be populated here -->
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    const compareBtn = document.getElementById('compare-btn') as HTMLElement;
    const clearBtn = document.getElementById('clear-btn') as HTMLElement;

    compareBtn?.addEventListener('click', () => this.handleCompare());
    clearBtn?.addEventListener('click', () => this.handleClear());

    // Add change listeners for dropdowns to enable/disable compare button
    const dropdowns = document.querySelectorAll('vscode-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('change', () => this.updateCompareButtonState());
    });
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      switch (message.command) {
        case 'init':
          this.handleInit();
          break;
        case 'table-diff-result':
          this.handleDiffResult(message.payload);
          break;
        case 'table-diff-clear':
          this.handleClearResult();
          break;
        case 'table-diff-error':
          this.handleError(message.payload);
          break;
      }
    });
  }

  private handleInit() {
    console.log('Table Diff panel initialized');
    // Request available connections/schemas/tables if needed
  }

  private handleCompare() {
    const sourceConnection = (document.getElementById('source-connection') as any)?.value;
    const sourceSchema = (document.getElementById('source-schema') as any)?.value;
    const sourceTable = (document.getElementById('source-table') as any)?.value;
    const targetConnection = (document.getElementById('target-connection') as any)?.value;
    const targetSchema = (document.getElementById('target-schema') as any)?.value;
    const targetTable = (document.getElementById('target-table') as any)?.value;

    if (!sourceConnection || !sourceSchema || !sourceTable || 
        !targetConnection || !targetSchema || !targetTable) {
      return;
    }

    this.setLoading(true);
    
    vscode.postMessage({
      command: 'bruin.compareTables',
      payload: {
        source: {
          connection: sourceConnection,
          schema: sourceSchema,
          table: sourceTable
        },
        target: {
          connection: targetConnection,
          schema: targetSchema,
          table: targetTable
        }
      }
    });
  }

  private handleClear() {
    this.clearResults();
    vscode.postMessage({
      command: 'bruin.clearDiff'
    });
  }

  private handleDiffResult(result: any) {
    this.setLoading(false);
    this.displayResults(result);
  }

  private handleClearResult() {
    this.clearResults();
  }

  private handleError(error: any) {
    this.setLoading(false);
    this.displayError(error);
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
    const loadingContainer = document.getElementById('loading-container');
    const resultsContainer = document.getElementById('results-container');
    const diffResults = document.getElementById('diff-results');

    if (loading) {
      diffResults!.style.display = 'block';
      loadingContainer!.style.display = 'block';
      resultsContainer!.style.display = 'none';
    } else {
      loadingContainer!.style.display = 'none';
      resultsContainer!.style.display = 'block';
    }
  }

  private displayResults(result: any) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;

    // Placeholder for actual diff results display
    resultsContainer.innerHTML = `
      <div class="diff-summary">
        <h3>Comparison Results</h3>
        <p>Diff results would be displayed here</p>
        <pre>${JSON.stringify(result, null, 2)}</pre>
      </div>
    `;
  }

  private displayError(error: any) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <div class="error-message">
        <h3>Error</h3>
        <p>${error.message || 'Failed to compare tables'}</p>
      </div>
    `;
  }

  private clearResults() {
    const diffResults = document.getElementById('diff-results');
    const resultsContainer = document.getElementById('results-container');
    
    diffResults!.style.display = 'none';
    resultsContainer!.innerHTML = '';
  }

  private updateCompareButtonState() {
    const compareBtn = document.getElementById('compare-btn') as any;
    const sourceConnection = (document.getElementById('source-connection') as any)?.value;
    const sourceSchema = (document.getElementById('source-schema') as any)?.value;
    const sourceTable = (document.getElementById('source-table') as any)?.value;
    const targetConnection = (document.getElementById('target-connection') as any)?.value;
    const targetSchema = (document.getElementById('target-schema') as any)?.value;
    const targetTable = (document.getElementById('target-table') as any)?.value;

    const allSelected = sourceConnection && sourceSchema && sourceTable && 
                      targetConnection && targetSchema && targetTable;
    
    compareBtn.disabled = !allSelected;
  }
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TableDiffApp());
} else {
  new TableDiffApp();
}

// Handle hot module replacement for development
if (module.hot) {
  module.hot.accept();
}