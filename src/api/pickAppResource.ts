/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, ITreeItemPickerContext } from "@microsoft/vscode-azext-utils";
import { PickAppResourceOptions } from "@microsoft/vscode-azext-utils/hostapi";
import { ext } from "../extensionVariables";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";

export async function pickAppResource<T extends AzExtTreeItem>(context: ITreeItemPickerContext, options?: PickAppResourceOptions): Promise<T> {
    context.canPickMany = false;
    const subscription = await ext.appResourceTree.showTreeItemPicker(SubscriptionTreeItem.contextValue, context) as SubscriptionTreeItem;
    const appResource = await subscription.pickAppResource(context, options);

    if (options?.expectedChildContextValue) {
        return ext.appResourceTree.showTreeItemPicker(options.expectedChildContextValue, context, appResource) as unknown as T;
    } else {
        return appResource as unknown as T;
    }
}
