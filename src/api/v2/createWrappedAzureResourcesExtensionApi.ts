/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandlingSync, IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureResourcesApiInternal, AzureResourcesApiWithContext } from '../../../hostapi.v2.internal';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RemoveContextFromParameterList<T extends [context: IActionContext, ...rest: unknown[]]> = T extends [infer _context, ...infer Rest] ? Rest : never;

type FuncWithContextParam = (context: IActionContext, ...args: unknown[]) => unknown;
type FuncsWithContextParam = { [functionName: string]: FuncWithContextParam; };

type FuncWithoutContextParam<T extends FuncWithContextParam> = (...args: RemoveContextFromParameterList<Parameters<T>>) => ReturnType<T>;
type FuncsWithoutContextParam<T extends FuncsWithContextParam> = { [K in keyof T]: FuncWithoutContextParam<T[K]> };

export function createWrappedAzureResourcesExtensionApi(api: AzureResourcesApiWithContext, extensionId: string): AzureResourcesApiInternal {

    function wrap<TFunctions extends FuncsWithContextParam>(functions: TFunctions): FuncsWithoutContextParam<TFunctions> {
        return wrapFunctionsInTelemetry(functions, {
            callbackIdPrefix: 'v2.',
            beforeHook: context => context.telemetry.properties.callingExtensionId = extensionId,
        });
    }

    return Object.freeze({
        apiVersion: api.apiVersion,
        activity: wrap({
            registerActivity: api.activity.registerActivity.bind(api) as typeof api.activity.registerActivity,
        }),
        resources: {
            azureResourceTreeDataProvider: api.resources.azureResourceTreeDataProvider,
            workspaceResourceTreeDataProvider: api.resources.workspaceResourceTreeDataProvider,
            ...wrap({
                registerAzureResourceBranchDataProvider: api.resources.registerAzureResourceBranchDataProvider.bind(api) as typeof api.resources.registerAzureResourceBranchDataProvider,
                registerAzureResourceProvider: api.resources.registerAzureResourceProvider.bind(api) as typeof api.resources.registerAzureResourceProvider,
                registerWorkspaceResourceProvider: api.resources.registerWorkspaceResourceProvider.bind(api) as typeof api.resources.registerWorkspaceResourceProvider,
                registerWorkspaceResourceBranchDataProvider: api.resources.registerWorkspaceResourceBranchDataProvider.bind(api) as typeof api.resources.registerWorkspaceResourceBranchDataProvider,
                revealAzureResource: api.resources.revealAzureResource.bind(api) as typeof api.resources.revealAzureResource,
            }),
        }
    });
}

interface WrapFunctionsInTelemetryOptions {
    /**
     * Called before each function is executed. Intended for adding telemetry properties.
     */
    beforeHook?(context: IActionContext): void;
    /**
     * Optionally add a prefix to all function callbackIds.
     */
    callbackIdPrefix?: string;
}

/**
 * Wraps functions that take an `IActionContext` as their first parameter in telemetry handling.
 *
 * @param functions Functions that take `IActionContext` as their first parameter to wrap. The keys of the object will be used as the callbackId for telemetry.
 * @param options see {@link WrapFunctionsInTelemetryOptions}
 * @returns the same set of functions, but with the `IActionContext` removed from the parameter list.
 */
function wrapFunctionsInTelemetry<TFunctions extends FuncsWithContextParam>(functions: TFunctions, options?: WrapFunctionsInTelemetryOptions): FuncsWithoutContextParam<TFunctions> {
    const wrappedFunctions: Partial<FuncsWithoutContextParam<TFunctions>> = {};
    Object.entries(functions).forEach(([functionName, func]: [keyof TFunctions, FuncWithContextParam]) => {
        const wrappedFunction: FuncWithoutContextParam<typeof func> = (...args: RemoveContextFromParameterList<Parameters<typeof func>>): ReturnType<typeof func> => {
            return callWithTelemetryAndErrorHandlingSync((options?.callbackIdPrefix ?? '') + functionName.toString(), context => {
                context.errorHandling.rethrow = true;
                context.errorHandling.suppressDisplay = true;
                context.errorHandling.suppressReportIssue = true;
                options?.beforeHook?.(context);
                return func(context, ...args);
            });
        };
        wrappedFunctions[functionName] = wrappedFunction;
    });

    return wrappedFunctions as FuncsWithoutContextParam<TFunctions>;
}


