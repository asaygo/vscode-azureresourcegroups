import { getExtensionExports } from "@microsoft/vscode-azext-utils";
import { AzureExtensionApiProvider } from "@microsoft/vscode-azext-utils/api";
import assert = require("assert");

suite('v1 API tests', async () => {
    test('v1 API is not undefined', async () => {
        const apiProvider = await getExtensionExports<AzureExtensionApiProvider>('ms-azuretools.vscode-azureresourcegroups');

        assert.ok(apiProvider, 'API provider is undefined');

        const v1Api = apiProvider.getApi('0.0.1', {
            extensionId: 'ms-azuretools.vscode-azureresourcegroups-tests',
        });

        assert.notStrictEqual(v1Api, undefined);
    });
});
