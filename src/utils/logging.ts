/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzureLogger, setLogLevel } from "@azure/logger";
import { ext } from "../extensionVariables";

export function setupAzureLogger(): void {
    setLogLevel("info");

    // override logging to output to console.log (default location is stderr)
    AzureLogger.log = (...args) => {
        ext.outputChannel.debug(args.join(' '));
    };
}
