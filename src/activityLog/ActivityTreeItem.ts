/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ActivityStatus, AzExtParentTreeItem, AzExtTreeItem, callWithTelemetryAndErrorHandling, IActionContext, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { Activity, ActivityTreeItemOptions } from "@microsoft/vscode-azext-utils/hostapi";
import { Disposable, ThemeColor, ThemeIcon, TreeItemCollapsibleState } from "vscode";
import { localize } from "../utils/localize";

export class ActivityTreeItem extends AzExtParentTreeItem implements Disposable {

    public startedAtMs: number;

    public get contextValue(): string {
        const contextValues = new Set(['azureActivity', ...(this.state.contextValuesToAdd ?? [])]);
        return Array.from(contextValues).sort().join(';');
    }

    public get label(): string {
        return this.state.label;
    }

    public get description(): string | undefined {
        switch (this.activity.status) {
            case ActivityStatus.Failed:
                return localize('failed', 'Failed');
            case ActivityStatus.Succeeded:
                return localize('succeeded', 'Succeeded');
            default:
                return this.activity.message;
        }
    }

    public get iconPath(): TreeItemIconPath | undefined {
        switch (this.activity.status) {
            case ActivityStatus.Failed:
                return new ThemeIcon('error', new ThemeColor('testing.iconFailed'));
            case ActivityStatus.Succeeded:
                return new ThemeIcon('pass', new ThemeColor('testing.iconPassed'));
            default:
                return new ThemeIcon('loading~spin');
        }
    }

    private state: ActivityTreeItemOptions = {
        label: localize('loading', 'Loading...')
    }

    public initialCollapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None;

    public constructor(parent: AzExtParentTreeItem, public readonly activity: Activity) {
        super(parent);
        this.id = activity.id;
        this.setupListeners(activity);
        this.startedAtMs = Date.now();
    }

    public dispose(): void {
        this.disposables.forEach(d => { d.dispose() });
    }

    private readonly disposables: Disposable[] = [];

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (this.state.getChildren) {
            return await this.state.getChildren(this);
        }
        return [];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    private onChange(): void {
        void callWithTelemetryAndErrorHandling('activityOnChange', async (context) => {
            this.state = this.activity.options;
            if (this.state.getChildren) {
                this.initialCollapsibleState = TreeItemCollapsibleState.Expanded;
            }
            await this.refresh(context);
        });
    }

    private setupListeners(activity: Activity): void {
        this.disposables.push(activity.onChange(this.onChange.bind(this)));
    }
}
