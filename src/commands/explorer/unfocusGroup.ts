/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { GroupTreeItemBase } from "../../tree/GroupTreeItemBase";
import { settingUtils } from "../../utils/settingUtils";

export async function unfocusGroup(context: IActionContext, node?: GroupTreeItemBase): Promise<void> {
    await settingUtils.updateGlobalSetting('focusedGroup', "");
    await ext.tree.refresh(context, node?.parent);
}
