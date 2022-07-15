/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { Filter } from "@microsoft/vscode-azext-utils/hostapi";

export class MatchAllFilter<T> implements Filter<T> {
    matches(): boolean {
        return true;
    }
}
