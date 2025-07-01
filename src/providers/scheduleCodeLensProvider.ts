import * as vscode from "vscode";
import { cronToHumanReadable } from "../utilities/helperUtils";


export class ScheduleCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    
    // Only process .bruin.yml and .bruin.yaml files
    const fileName = document.fileName;
    if (!fileName.endsWith('pipeline.yml') && !fileName.endsWith('pipeline.yaml')) {
      return codeLenses;
    }

    const text = document.getText();
    const lines = text.split('\n');

    // Find schedule fields with regex
    for (let i = 0; i < lines.length; i++) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }

      const line = lines[i];
      const scheduleMatch = line.match(/^\s*schedule\s*:\s*(.+)$/);
      
      if (scheduleMatch) {
        const scheduleValue = scheduleMatch[1].trim().replace(/["']/g, '');
        const humanReadable = cronToHumanReadable(scheduleValue);
        
        // Create a range at the beginning of the schedule line itself
        const codeLensLine = i;
        const lineRange = new vscode.Range(codeLensLine, 0, codeLensLine, 0);
        
        codeLenses.push(
          new vscode.CodeLens(lineRange, {
            title: `${humanReadable}`,
            command: "",
          })
        );
      }
    }

    return codeLenses;
  }
}