import { AzExtResourceType } from "@microsoft/vscode-azext-utils";
import { AzureExtensionApiProvider } from "@microsoft/vscode-azext-utils/api";
import { AzureResource, AzureResourcesApi, BranchDataProvider, ResourceModelBase, WorkspaceResource, WorkspaceResourceBranchDataProvider, WorkspaceResourceProvider } from "@microsoft/vscode-azext-utils/hostapi.v2";
import { commands, extensions, TreeItem } from "vscode";
import { ext } from "../../extension.bundle";
import assert = require("assert");

const getWorkspaceResourceProviderStub: (onCalled?: () => void, resources?: WorkspaceResource[]) => WorkspaceResourceProvider = (onCalled, resources) => {
    return {
        getResources: async (source) => {
            if (source) {
                return;
            }
            onCalled?.();
            return resources ?? [];
        }
    }
}

const api = () => {
    return ext.v2.api.resources;
}

suite('Host API v2 Tests', async () => {

    test('Host API v2 can be instantiated', async () => {
        const apiProvider = await extensions.getExtension('ms-azuretools.vscode-azureresourcegroups')?.activate() as AzureExtensionApiProvider;
        const api = apiProvider.getApi<AzureResourcesApi>('2.0.0');
        assert.ok(api);
    });

    test('Register Workspace resource provider does not throw', () => {
        const provider = getWorkspaceResourceProviderStub();
        assert.doesNotThrow(() => {
            api().registerWorkspaceResourceProvider(provider);
        });
    });

    test('Registered Workspace resource provider is used', async () => {
        let called = false;
        const provider = getWorkspaceResourceProviderStub(() => {
            called = true;
        });
        api().registerWorkspaceResourceProvider(provider);
        await commands.executeCommand('azureWorkspace.focus');
        await api().workspaceResourceTreeDataProvider.getChildren();
        assert.strictEqual(called, true, 'Workspace resource provider was not called');
    });

    test('Resources provided by workspace resource provider are then passed to the corresponding branch data provider', async () => {
        const workspaceResourceType = 'test1';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-1',
            name: 'Test Resource 1',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);

        let called = false;
        api().registerWorkspaceResourceBranchDataProvider(workspaceResourceType, {
            getResourceItem: (resource: WorkspaceResource): ResourceModelBase => {
                assert.strictEqual(resource, workspaceResource)
                called = true;
                return resource;
            },
            getChildren: (_resource: WorkspaceResource): WorkspaceResource[] => {
                return [];
            },
            getTreeItem: (resource: WorkspaceResource): TreeItem => {
                return new TreeItem(resource.name);
            }
        })

        await commands.executeCommand('azureWorkspace.focus');
        await api().workspaceResourceTreeDataProvider.getChildren();
        assert.strictEqual(called, true, 'Workspace resource branch data provider was not called');
    });

    test('Provided workspace tree items are displayed', async () => {
        const workspaceResourceType = 'test2';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-2',
            name: 'Test Resource 2',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);
        api().registerWorkspaceResourceBranchDataProvider(workspaceResourceType, {
            getResourceItem: (resource: WorkspaceResource): ResourceModelBase => {
                return resource;
            },
            getChildren: (_resource: WorkspaceResource): WorkspaceResource[] => {
                return [];
            },
            getTreeItem: (resource: WorkspaceResource): TreeItem => {
                return new TreeItem(resource.name);
            }
        })

        await commands.executeCommand('azureWorkspace.focus');
        const children = await api().workspaceResourceTreeDataProvider.getChildren() as any[];
        const testChild = children.find(c => c.id === workspaceResource.id);
        assert.ok(testChild);
    });

    test('Provided workspace tree items children are displayed', async () => {
        const workspaceResourceType = 'test3';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-3',
            name: 'Test Resource 3',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);
        api().registerWorkspaceResourceBranchDataProvider(workspaceResourceType, {
            getResourceItem: (resource: WorkspaceResource): ResourceModelBase => {
                return resource;
            },
            getChildren: (_resource: WorkspaceResource): WorkspaceResource[] => {
                return [
                    {
                        id: 'test-resource-3-child',
                        name: 'Test Resource 3 Child',
                        resourceType: workspaceResourceType,
                    }
                ];
            },
            getTreeItem: (resource: WorkspaceResource): TreeItem => {
                return new TreeItem(resource.name);
            }
        })

        await commands.executeCommand('azureWorkspace.focus');
        const children = await api().workspaceResourceTreeDataProvider.getChildren() as any[];
        const testChild = children.find(c => c.id === workspaceResource.id);

        const testChildChildren = await api().workspaceResourceTreeDataProvider.getChildren(testChild) as any[];
        assert.strictEqual(testChildChildren.length, 1);
        assert.strictEqual(testChildChildren[0].id, 'test-resource-3-child');
    });

    test('Get tree item is called for branch data provider items', async () => {
        const workspaceResourceType = 'test-4';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-3',
            name: 'Test Resource 3',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);

        const branchDataProvider = new TestBranchDataProvider();

        const childResource: WorkspaceResource = {
            id: 'test-resource-child',
            name: 'Test Resource 3 Child',
            resourceType: workspaceResourceType,
        }

        branchDataProvider.registerChildren(workspaceResource, [childResource]);

        await commands.executeCommand('azureWorkspace.focus');
        const rootChildren = await api().workspaceResourceTreeDataProvider.getChildren() as any[];
        const testChild = rootChildren.find(c => c.id === workspaceResource.id);
        branchDataProvider.assertGetTreeItemCalledAsync(async () => {
            await api().workspaceResourceTreeDataProvider.getTreeItem(testChild);
        });
    });

    test('Get tree item is called for branch data provider child items', async () => {
        const workspaceResourceType = 'test56';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-56',
            name: 'Test Resource 56',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);

        const branchDataProvider = new TestBranchDataProvider();

        await commands.executeCommand('azureWorkspace.focus');
        const rootItems = await api().workspaceResourceTreeDataProvider.getChildren() as any[];
        const workspaceRootItem = rootItems.find(c => c.id === workspaceResource.id);

        assert.ok(workspaceRootItem, 'No root child found');

        const childResource: WorkspaceResource = {
            id: 'test-resource-child',
            name: 'Test Resource 3 Child',
            resourceType: workspaceResourceType,
        }

        branchDataProvider.registerChildren(workspaceResource, [childResource]);
        const grandchildren = await api().workspaceResourceTreeDataProvider.getChildren(workspaceRootItem) as any[];
        assert.strictEqual(grandchildren.length, 1);

        const testGrandchild = grandchildren[0];
        assert.strictEqual(testGrandchild.id, childResource.id);

        branchDataProvider.assertGetTreeItemCalledAsync(async () => {
            await api().workspaceResourceTreeDataProvider.getTreeItem(testGrandchild);
        });
    });

    test('Branch data provider getTreeItem is properly called for branch data provider items', async () => {
        const workspaceResourceType = 'test6';
        const workspaceResource: WorkspaceResource = {
            resourceType: workspaceResourceType,
            id: 'test-resource-3',
            name: 'Test Resource 3',
        };
        const provider = getWorkspaceResourceProviderStub(undefined, [workspaceResource]);
        api().registerWorkspaceResourceProvider(provider);

        let getTreeItemCalled = false;
        api().registerWorkspaceResourceBranchDataProvider(workspaceResourceType, {
            getResourceItem: (resource: WorkspaceResource): ResourceModelBase => {
                return resource;

            },
            getChildren: (_resource: WorkspaceResource): WorkspaceResource[] => {
                return [];
            },
            getTreeItem: (resource: WorkspaceResource): TreeItem => {
                getTreeItemCalled = true;
                assert.strictEqual(resource, workspaceResource);
                return new TreeItem(resource.name);
            }
        })

        await commands.executeCommand('azureWorkspace.focus');
        const children = await api().workspaceResourceTreeDataProvider.getChildren() as any[];
        const testChild = children.find(c => c.id === workspaceResource.id);
        const treeItem = await api().workspaceResourceTreeDataProvider.getTreeItem(testChild);

        assert.strictEqual(treeItem.label, workspaceResource.name);
        assert.strictEqual(getTreeItemCalled, true);
    });

    test('Registered Azure resource branch data provider is used', async () => {
        let getResourceItemIsCalled = false;
        const azureResourceBranchDataProvider: BranchDataProvider<AzureResource, ResourceModelBase> = {
            getResourceItem: (resource: AzureResource): ResourceModelBase => {
                getResourceItemIsCalled = true;
                return {
                    id: resource.id,
                }
            },
            getChildren: (_resource: AzureResource): AzureResource[] => {
                return [];
            },
            getTreeItem: (resource: AzureResource): TreeItem => {
                return new TreeItem(resource.name);
            }
        }

        api().registerAzureResourceBranchDataProvider(AzExtResourceType.FunctionApp, azureResourceBranchDataProvider);
        await commands.executeCommand('azureResourceGroups.focus');
        await commands.executeCommand('azureResourceGroups.groupBy.resourceType');

        const tdp = api().azureResourceTreeDataProvider;
        const subscriptions = await tdp.getChildren();
        const groups = await tdp.getChildren(subscriptions![0]) as TreeItem[];
        const functionGroup = groups!.find(g => g.label?.toString().includes('Func'));
        await tdp.getChildren(functionGroup);

        assert.strictEqual(getResourceItemIsCalled, true);
    });
});

export class TestBranchDataProvider implements WorkspaceResourceBranchDataProvider<WorkspaceResource> {

    private _getChildrenCalled = false;
    private _getResourceItemCalled = false;
    private _getTreeItemCalled = false;

    private _childrenMap: Map<WorkspaceResource, WorkspaceResource[]> = new Map();

    registerChildren(parent: WorkspaceResource, children: WorkspaceResource[]): void {
        this._childrenMap.set(parent, children);
    }

    async assertGetChildrenCalledAsync(block: () => Promise<void>): Promise<void> {
        await block();
        assert.strictEqual(this._getChildrenCalled, true, 'Get children was not called');
    }

    async assertGetResourceItemCalledAsync(block: () => Promise<void>): Promise<void> {
        await block();
        assert.strictEqual(this._getResourceItemCalled, true, 'Get resource item was not called');
    }

    async assertGetTreeItemCalledAsync(block: () => Promise<void>): Promise<void> {
        await block();
        assert.strictEqual(this._getTreeItemCalled, true, 'Get tree item was not called');
    }

    getChildren(_element: WorkspaceResource): WorkspaceResource[] {
        this._getChildrenCalled = true;
        return this._childrenMap.get(_element) ?? [];
    }

    getResourceItem(element: WorkspaceResource): WorkspaceResource {
        this._getResourceItemCalled = true;
        return element;
    }

    getTreeItem(element: WorkspaceResource): TreeItem {
        this._getTreeItemCalled = true;
        return new TreeItem(element.name)
    }
}
