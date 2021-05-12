// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, render, Component } from 'preact';
import type { Grid, GridOptions, ColDef, ValueFormatterParams, GetQuickFilterTextParams, ITooltipParams } from '@ag-grid-community/core';

import '@ag-grid-community/core/dist/styles/ag-grid.min.css';
import '@ag-grid-community/core/dist/styles/ag-theme-alpine.min.css';
import './render.css';
import type { NotebookRendererApi } from 'vscode-notebook-renderer';


interface IRenderInfo {
  container: HTMLElement;
  mimeType: string;
  gridOptions: GridOptions;
  metaData?: DataGridMetaData,
  notebookApi: NotebookRendererApi<unknown>;
}

export function renderCell({ container, mimeType, gridOptions, metaData }: IRenderInfo): void {
  if (mimeType === 'x-application/httpbook-grid') {
    render(<DataGrid gridOptions={gridOptions} metaData={metaData}/>, container);
  }
}

interface DataGridMetaData {
  numberOfRowsForColDefRecognition?: number,
  columnDefs?: string,
}

export class DataGrid extends Component<{ gridOptions: GridOptions, metaData?: DataGridMetaData }, { grid: Grid }> {
  private ref: HTMLElement | null = null;
  async componentDidMount(): Promise<void> {
    if (this.ref) {
      const gridOptions: GridOptions = {
        columnDefs: this.getColumnDefs(this.props.gridOptions.rowData, this.props.metaData),
      };
      const { Grid } = await import(/* webpackChunkName: "aggrid" */ '@ag-grid-community/core');
      const { ClientSideRowModelModule } = await import(/* webpackChunkName: "aggrid" */ '@ag-grid-community/client-side-row-model');
      const grid = new Grid(this.ref, Object.assign(this.props.gridOptions, gridOptions), { modules: [ClientSideRowModelModule] });
      this.setState({
        grid,
      });
    }
  }

  componentWillUnmount() : void {
    this.state.grid.destroy();
  }

  onInput({ target, preventDefault }: {target: EventTarget | null, preventDefault: () => void}): void {
    if (target && target instanceof HTMLInputElement) {
      const { value } = target;
      if (this.props.gridOptions.api) {
        this.props.gridOptions.api.setQuickFilter(value);
      }
    }
    preventDefault();
  }

  render() : h.JSX.Element {
    return (
      <section>
        <div class="grid_controls">
          <input type="text" class="searchinput" placeholder="Search" onInput={this.onInput.bind(this)} label="search" />
        </div>
        <div class="ag-theme-alpine" ref={ref => {
          this.ref = ref;
        }}>
          {!!this.state.grid}
        </div>
      </section>
    );
  }

  private getColumnDefs(rowData: Array<unknown> | undefined, metaData?: DataGridMetaData): ColDef[] {
    if (metaData?.columnDefs) {
      return metaData.columnDefs.split(',').map(obj => {
        const col = obj.split('=');
        if (col.length > 1) {
          return {
            headerName: col[1].trim(),
            field: col[0].trim(),
          };
        }
        return {
          headerName: obj.trim(),
          field: obj.trim(),
        };
      });
    }
    const result: ColDef[] = [];

    const maxRows = metaData?.numberOfRowsForColDefRecognition || result.length;
    let index = 0;
    if (rowData) {
      for (const row of rowData) {
        if (index++ > maxRows) {
          break;
        }
        result.push(...this.getColDefs(row));
      }
    }
    const colDefs = result.filter((obj, index, self) => self.findIndex(col => col.field === obj.field) === index);

    colDefs.push({
      field: '_json',
      tooltipValueGetter: jsonDataFormatter,
      valueFormatter: jsonDataFormatter,
      getQuickFilterText: jsonDataFormatter,
    });
    return colDefs;
  }

  private getColDefs(obj: unknown): ColDef[] {
    const result: ColDef[] = [];
    if (typeof obj === 'object') {
      for (const [field, value] of Object.entries(obj as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          result.push({
            tooltipValueGetter: jsonFormatter,
            valueFormatter: jsonFormatter,
            getQuickFilterText: jsonFormatter,
            headerName: field,
            field,
          });
        } else if (typeof value === 'object') {
          result.push(...this.getColDefs(value).map(colDef => ({
            ...colDef,
            tooltipField: `${field}.${colDef.field}`,
            field: `${field}.${colDef.field}`,
            headerName: `${field}.${colDef.field}`,
          })));
        } else {
          const colDef: ColDef = {
            tooltipField: field,
            field,
            headerName: field,
          };
          result.push(colDef);
        }
      }
    }
    return result;
  }
}
function jsonFormatter(obj: ValueFormatterParams |GetQuickFilterTextParams | ITooltipParams) {
  return JSON.stringify(obj.value, null, 2);
}
function jsonDataFormatter(obj: ValueFormatterParams |GetQuickFilterTextParams | ITooltipParams) {
  return JSON.stringify(obj.data, null, 2);
}
