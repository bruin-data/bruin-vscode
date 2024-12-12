import * as vscode from 'vscode';

export function promptForTelemetryConsent() {
    const config = vscode.workspace.getConfiguration('bruin');
    const telemetryEnabled = config.get<boolean>('telemetry.enabled');
  
    if (!telemetryEnabled) {
      vscode.window.showInformationMessage(
        'Help improve Bruin by allowing anonymous usage data collection. This helps us understand how the extension is used.', 
        'Allow', 
        'Decline'
      ).then(selection => {
        if (selection === 'Allow') {
          config.update('telemetry.enabled', true, vscode.ConfigurationTarget.Global);
        } else if (selection === 'Decline') {
          config.update('telemetry.enabled', false, vscode.ConfigurationTarget.Global);
        }
      });
    }
  }