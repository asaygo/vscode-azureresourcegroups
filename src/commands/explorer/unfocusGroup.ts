/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { settingUtils } from "../../utils/settingUtils";

export async function unfocusGroup(_context: IActionContext): Promise<void> {
    await settingUtils.updateGlobalSetting('focusedGroup', "");
}
