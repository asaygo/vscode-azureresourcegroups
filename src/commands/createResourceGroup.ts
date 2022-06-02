/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IResourceGroupWizardContext, LocationListStep, ResourceGroupCreateStep, ResourceGroupNameStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, ExecuteActivityContext, IActionContext, nonNullProp } from '@microsoft/vscode-azext-utils';
import { window } from 'vscode';
import { ext } from '../extensionVariables';
import { SubscriptionTreeItem } from '../tree/SubscriptionTreeItem';
import { createActivityContext } from '../utils/activityUtils';
import { localize } from '../utils/localize';

export async function createResourceGroup(context: IActionContext, node?: SubscriptionTreeItem): Promise<void> {
    if (!node) {
        node = await ext.appResourceTree.showTreeItemPicker<SubscriptionTreeItem>(SubscriptionTreeItem.contextValue, context);
    }

    const wizardContext: IResourceGroupWizardContext & ExecuteActivityContext = {
        ...context, ...node.subscription, suppress403Handling: true,
        ...(await createActivityContext()),
    };

    const title: string = localize('createResourceGroup', 'Create Resource Group');
    const promptSteps: AzureWizardPromptStep<IResourceGroupWizardContext>[] = [new ResourceGroupNameStep()];
    LocationListStep.addStep(wizardContext, promptSteps);
    const executeSteps: AzureWizardExecuteStep<IResourceGroupWizardContext>[] = [new ResourceGroupCreateStep()];
    const wizard: AzureWizard<IResourceGroupWizardContext & ExecuteActivityContext> = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    const newResourceGroupName = nonNullProp(wizardContext, 'newResourceGroupName');
    wizardContext.activityTitle = localize('createResourceGroup', 'Create Resource Group "{0}"', newResourceGroupName);
    await wizard.execute();

    await ext.appResourceTree.refresh(context);

    void window.showInformationMessage(localize('createdRg', 'Created resource group "{0}".', newResourceGroupName));
}
