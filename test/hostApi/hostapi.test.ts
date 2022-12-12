import { AzureResource, AzureResourceModel } from "@microsoft/vscode-azext-utils/hostapi.v2";
import { TreeItem } from "vscode";
import { AzExtResourceType, ext } from "../../extension.bundle";
import assert = require("assert");

suite.skip('host api', async () => {
    test('Host API is not undefined', async () => {
        assert.notStrictEqual(ext.v2.api, undefined);
    });

    test('registering thing with same id throws', async () => {
        ext.v2.api.resources.registerAzureResourceBranchDataProvider(AzExtResourceType.FunctionApp, {
            getChildren(element: AzureResourceModel) {
                return [{
                    ...element
                }];
            },
            getResourceItem(resource: AzureResource) {
                return resource;
            },
            getTreeItem(element: AzureResourceModel) {
                return new TreeItem(element.id ?? 'unknown');
            }
        })
    });

    const tdp = ext.v2.api.resources.azureResourceTreeDataProvider;
    const subscriptions = await tdp.getChildren(undefined);
    const groups = await tdp.getChildren(subscriptions![0]) as TreeItem[];
    const functionGroup = groups!.find(g => g.label?.toString().includes('Func'));
    const functionApps = await tdp.getChildren(functionGroup);
    assert(functionApps!.length > 0);
});
