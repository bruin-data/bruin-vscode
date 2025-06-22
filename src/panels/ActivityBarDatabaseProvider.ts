import * as vscode from 'vscode';

class Dependency extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: Dependency[]
  ) {
    super(label, collapsibleState);
  }
}

export class ActivityBarDatabaseProvider implements vscode.TreeDataProvider<Dependency> {
  private data: Dependency[];

  constructor() {
    this.data = this.createData();
  }

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Dependency): Promise<Dependency[]> {
    return Promise.resolve(element?.children ?? this.data);
  }

  private createData(): Dependency[] {
    const db2Tables = [
      new Dependency('table1', vscode.TreeItemCollapsibleState.None),
      new Dependency('table2', vscode.TreeItemCollapsibleState.None),
      new Dependency('table3', vscode.TreeItemCollapsibleState.None),
    ];

    const d1Tables = [
      new Dependency('deneme1', vscode.TreeItemCollapsibleState.None),
      new Dependency('deneme', vscode.TreeItemCollapsibleState.None),
    ];

    return [
      new Dependency('my-db-1', vscode.TreeItemCollapsibleState.Collapsed,d1Tables),
      new Dependency('my-db-2', vscode.TreeItemCollapsibleState.Collapsed, db2Tables)
    ];
  }
}
