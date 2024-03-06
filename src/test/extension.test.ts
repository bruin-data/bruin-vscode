import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { bruinFoldingRangeProvider } from '../providers/bruinFoldingRangeProvider';
import { test } from 'mocha';

function createMockTextDocument(content: string[], languageId: string): any {
    return {
        lineAt: (lineNumber: number) => {
            return { text: content[lineNumber] };
        },
        lineCount: content.length,
        languageId
    };
}



suite('Folding Range Provider Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
    const tests = [
        {
            languageId: 'python',
            content: [
                '""" @bruin',
                'name: dashboard.bookings',
                'type: python',
                ' depends:',
                ' - raw.Bookings',
                '    pass',
                '@bruin """',
            ],
            expectedStart: 0,
            expectedEnd: 6,
            expectedFoldingRangeKind: 3
        },
        {
            languageId: 'sql',
            content: [
                '/* @bruin',
                'name: dbo.hello_ms',
                'type: ms.sql',
                'materialization:',
                '   type: table',
                'columns:',
                '  - name: one',
                '    type: integer',
                '    description: \'Just a number\'',
                '    checks:',
                '        - name: unique',
                '        - name: not_null',
                '        - name: positive',
                '        - name: accepted_values',
                '          value: [1, 2]',
                '@bruin */',
            ],
            expectedStart: 0,
            expectedEnd: 15,
            expectedFoldingRangeKind: 3
        }
    ];


        tests.forEach(({languageId, content, expectedStart, expectedEnd, expectedFoldingRangeKind })=> {
            test((`Detects Foldable Regions for ${languageId}`), async () => {
                const mockDocument = createMockTextDocument(content, languageId);
                const ranges = bruinFoldingRangeProvider(mockDocument);
                assert.strictEqual(ranges.length, 1, "Should detect one foldable region");
                assert.strictEqual(ranges[0].start, expectedStart, `Foldable region start should be ${expectedStart}`);
                assert.strictEqual(ranges[0].end, expectedEnd, `Foldable region end should be ${expectedEnd}`);
                assert.strictEqual(ranges[0].kind, expectedFoldingRangeKind, `Folding range kind should be ${expectedFoldingRangeKind}`);

            });
        });
            
    });

