import { GridOptions } from '@ag-grid-community/core';
import * as Httpyac from 'httpyac';
import * as vscode from 'vscode';
import { AppConfig } from './config';
import get from 'lodash/get';
import { HttpOutputProvider, HttpOutputResult, HttpOutputPriority } from './httpBookExtensionApi';

export class GridHttpOutpoutProvider implements HttpOutputProvider {
  id = 'httpbook-grid';

  constructor(readonly config: AppConfig) {}

  getOutputResult(httpRegion: Httpyac.HttpRegion): HttpOutputResult | false {
    if (httpRegion.response?.parsedBody) {

      let rowData: Array<unknown> | false = false;
      let priority = HttpOutputPriority.Default;
      const explicitField = httpRegion.metaData['grid.arrayField'];
      if (explicitField) {
        const fieldValue = get(httpRegion.response.parsedBody, explicitField);
        if (Array.isArray(fieldValue)) {
          rowData = fieldValue;
          priority = HttpOutputPriority.High;
        }
      } else {
        rowData = this.findArray(httpRegion.response.parsedBody);
      }
      if (rowData) {
        const gridOptions: GridOptions = Object.assign({}, this.config.gridOptions, {
          rowData
        });
        return {
          outputItems: new vscode.NotebookCellOutputItem(
            'x-application/httpbook-grid',
            gridOptions,
            {
              numberOfRowsForColDefRecognition: +httpRegion.metaData['grid.rowsForColumnDefs'] || this.config.numberOfRowsForColDefRecognition,
              columnDefs: httpRegion.metaData['grid.columnDefs'],
            }
          ),
          priority
        };
      }
    }
    return false;
  }

  private findArray(data: unknown): Array<unknown> | false {
    if (Array.isArray(data)) {
      return data;
    }
    if (typeof data === 'object') {
      for (const [, value] of Object.entries(data as Record<string, string>)) {
        const result = this.findArray(value);
        if (result) {
          return result;
        }
      }
    }
    return false;
  }
}
