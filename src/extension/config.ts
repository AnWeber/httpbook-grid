import { GridOptions } from '@ag-grid-community/core';
import * as vscode from 'vscode';


export const APP_NAME = 'httpbook-grid';


export interface AppConfig {
  gridOptions?: GridOptions;
  numberOfRowsForColDefRecognition?: number;
  searchBodyForArray?: boolean;

  readonly [key: string]: unknown;
}


export function getConfigSetting() : AppConfig {
  return vscode.workspace.getConfiguration(APP_NAME);
}

export type ConfigWatcher = (appConfig: AppConfig, ...config: Array<Record<string, unknown>>) => void

export function watchConfigSettings(watcher: ConfigWatcher, ...sections: Array<string>) : vscode.Disposable {
  const rootSections = [APP_NAME, ...sections];
  watcher(getConfigSetting(), ...sections.map(section => vscode.workspace.getConfiguration(section)));
  return vscode.workspace.onDidChangeConfiguration(changeEvent => {
    if (rootSections.some(section => changeEvent.affectsConfiguration(section))) {
      watcher(getConfigSetting(), ...sections.map(section => vscode.workspace.getConfiguration(section)));
    }
  });
}
