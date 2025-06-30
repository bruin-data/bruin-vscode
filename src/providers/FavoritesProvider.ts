import * as vscode from 'vscode';
import { getSchemaFavorites, saveSchemaFavorites, SchemaFavorite, createFavoriteKey } from "../extension/configuration";

class FavoriteItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly favorite: SchemaFavorite,
    public readonly contextValue: string = 'favorite'
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    this.iconPath = new vscode.ThemeIcon('star-full');
    this.tooltip = `${favorite.connectionName}.${favorite.schemaName}`;
  }
}

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> = new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private favorites: SchemaFavorite[] = [];

  constructor() {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.favorites = getSchemaFavorites();
  }

  public refresh(): void {
    this.loadFavorites();
    this._onDidChangeTreeData.fire();
  }

  public async removeFavorite(favorite: SchemaFavorite): Promise<void> {
    const favoriteKey = createFavoriteKey(favorite.schemaName, favorite.connectionName);
    this.favorites = this.favorites.filter(f => 
      createFavoriteKey(f.schemaName, f.connectionName) !== favoriteKey
    );
    
    await saveSchemaFavorites(this.favorites);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FavoriteItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FavoriteItem): Thenable<FavoriteItem[]> {
    if (!element) {
      // Root level - return all favorites
      return Promise.resolve(this.favorites.map(favorite => {
        const displayName = `${favorite.schemaName} (${favorite.connectionName})`;
        return new FavoriteItem(
          displayName,
          vscode.TreeItemCollapsibleState.None,
          favorite,
          'favorite'
        );
      }));
    }
    
    return Promise.resolve([]);
  }
} 