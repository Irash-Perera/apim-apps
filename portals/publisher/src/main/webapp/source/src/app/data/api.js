/* eslint-disable */
/*
 * Copyright (c) 2025, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import APIClientFactory from './APIClientFactory';
import Utils from './Utils';
import Resource from './Resource';
import cloneDeep from 'lodash.clonedeep';

const Configurations = require('Config');

/**
 * An abstract representation of an API
 */
class API extends Resource {
    constructor(name, version, context, kwargs) {
        super();
        let properties = kwargs;
        if (name instanceof Object) {
            properties = name;
            Utils.deepFreeze(properties);
        } else {
            this.name = name;
            this.version = version;
            this.context = context;
            this.isDefaultVersion = false;
            this.transport = ['http', 'https'];
            this.visibility = 'PUBLIC';
            this.endpointConfig = {
                endpoint_type: 'http',
                sandbox_endpoints: {
                    url: '',
                },
                production_endpoints: {
                    url: '',
                },
            };
        }
        this.apiType = API.CONSTS.API;
        this._data = properties;
        for (const key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                this[key] = properties[key];
            }
        }
    }

    /**
     *
     * @param data
     * @returns {object} Metadata for API request
     * @private
     */
    _requestMetaData() {
        Resource._requestMetaData();
    }

    /**
     *
     * Instance method of the API class to provide raw JSON object
     * which is API body friendly to use with REST api requests
     * Use this method instead of accessing the private _data object for
     * converting to a JSON representation of an API object.
     * Note: This is deep coping, Use sparingly, Else will have a bad impact on performance
     * Basically this is the revers operation in constructor.
     * This method simply iterate through all the object properties (excluding the properties in `excludes` list)
     * and copy their values to new object.
     * So use this method with care!!
     * @memberof API
     * @param {Array} [userExcludes=[]] List of properties that are need to be excluded from the generated JSON object
     * @returns {JSON} JSON representation of the API
     */
    toJSON(userExcludes = []) {
        var copy = {},
            excludes = ['_data', 'client', 'apiType', ...userExcludes];
        for (var prop in this) {
            if (!excludes.includes(prop)) {
                copy[prop] = cloneDeep(this[prop]);
            }
        }
        return copy;
    }

    importOpenAPIByFile(openAPIData, callback = null) {
        let payload, promisedCreate;
        promisedCreate = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                requestBody: {
                    file: openAPIData,
                    additionalProperties: JSON.stringify(apiData),
                }
            };

            const promisedResponse = client.apis['APIs'].importOpenAPIDefinition(
                null,
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promisedCreate;
    }

    importOpenAPIByUrl(openAPIUrl) {
        let payload, promise_create;

        promise_create = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                requestBody: {
                    url: openAPIUrl,
                    additionalProperties: JSON.stringify(apiData),
                }
            };

            const promisedResponse = client.apis['APIs'].importOpenAPIDefinition(
                null,
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_create;
    }

    importOpenAPIByInlineDefinition(inlineDefinition) {
        let payload, promise_create;

        promise_create = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                requestBody: {
                    inlineAPIDefinition: inlineDefinition,
                    additionalProperties: JSON.stringify(apiData),
                }
            };

            const promisedResponse = client.apis['APIs'].importOpenAPIDefinition(
                null,
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_create;
    }

    /**
     * Get list of workflow pending requests
     */
    workflowsGet(workflowType) {
        var limit = Configurations.app.workflows.limit;
        return this.client.then((client) => {
            return client.apis['Workflow (Collection)'].get_workflows(
                { workflowType: workflowType, limit: limit },
                    this._requestMetaData(),
            );
        });
    }
    
    /**
    * Get workflow pending request according to external workflow reference
    */
    workflowGet(externalWorkflowReference) {
        return this.client.then((client) => {
            return client.apis['Workflows (Individual)'].get_workflows__externalWorkflowRef_(
                { externalWorkflowReference: externalWorkflowReference },
                this._requestMetaData(),
            );
        });
    }
    
    /**
    * Update workflow request according to external workflow reference
    */
    updateWorkflow(workflowReferenceId,body) {
        return this.client.then((client) => {
            const payload = {
                workflowReferenceId: workflowReferenceId,
                'Content-Type': 'application/json',
            };
            return client.apis['Workflows (Individual)'].post_workflows_update_workflow_status(
                payload,
                { requestBody: body },
                this._requestMetaData(),
            );
        });
    }
    
    static validateOpenAPIByFile(openAPIData) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        let payload, promisedValidate;
        payload = {
            file: openAPIData,
            'Content-Type': 'multipart/form-data',
        };
        const requestBody = {
            requestBody: {
                file: openAPIData,
            },
        };
        promisedValidate = apiClient.then(client => {
            return client.apis.Validation.validateOpenAPIDefinition(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promisedValidate;
    }

    static validateOpenAPIByUrl(url, params = { returnContent: false }) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const payload = {
            'Content-Type': 'multipart/form-data',
            ...params
        };
        const requestBody = {
            requestBody: {
                url: url,
            },
        };
        return apiClient.then(client => {
            return client.apis['Validation'].validateOpenAPIDefinition(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });

    }

    static validateOpenAPIByInlineDefinition(inlineDefinition, params = { returnContent: false }) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const payload = {
            'Content-Type': 'multipart/form-data',
            ...params
        };
        const requestBody = {
            requestBody: {
                inlineAPIDefinition: inlineDefinition,
            },
        };
        return apiClient.then(client => {
            return client.apis['Validation'].validateOpenAPIDefinition(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });

    }

    /**
     * Get API Security Audit Report
     */
    getSecurityAuditReport(apiId) {
        const promiseGetAuditReport = this.client.then((client) => {
            return client.apis['API Audit'].getAuditReportOfAPI({
                apiId: apiId
            }, this._requestMetaData());
        });
        return promiseGetAuditReport;
    }

    /**
     * export an API Directory as A Zpi file
     * @returns {promise} Promise Containing the ZPI file of the selected API
     */
    export() {
        const apiZip = this.client.then((client) => {
            return client.apis['Import Export'].exportAPI({
                apiId: this.id
            }, this._requestMetaData({
                'accept': 'application/zip'
            })
            );
        });
        return apiZip;
    }

    /**
     * Get detailed policy information of the API
     * @returns {Promise} Promise containing policy detail request calls for all the available policies
     * @memberof API
     */
    getPolicies() {
        const promisedPolicies = this.policies.map(policy => {
            return this.client.then(client =>
                client.apis['Throttling Policies'].getThrottlingPolicyByName(
                    {
                        policyLevel: 'subscription',
                        policyName: policy,
                    },
                    this._requestMetaData(),
                ),
            );
        });
        return Promise.all(promisedPolicies).then(policies => policies.map(response => response.body));
    }

    getResourcePolicies(sequenceType = 'in') {
        return this.client.then(client => {
            return client.apis['API Resource Policies'].getAPIResourcePolicies({
                apiId: this.id,
                sequenceType,
            });
        });
    }

    updateResourcePolicy(resourcePolicy) {
        return this.client.then(client => {
            return client.apis['API Resource Policies'].updateAPIResourcePoliciesByPolicyId(
                {
                    apiId: this.id,
                    resourcePolicyId: resourcePolicy.id,
                },
                {
                    requestBody: {
                        httpVerb: resourcePolicy.httpVerb,
                        resourcePath: resourcePolicy.resourcePath,
                        content: resourcePolicy.content,
                    }
                }
            );
        });
    }

    setInlineProductionEndpoint(serviceURL) {
        this.endpointConfig.production_endpoints.url = serviceURL;
        return this.endpointConfig;
    }

    getProductionEndpoint() {
        if (!this.endpointConfig) {
            return null;
        }
        if (!this.endpointConfig.production_endpoints) {
            return '';
        }
        if (Array.isArray(this.endpointConfig.production_endpoints)) {
            return this.endpointConfig.production_endpoints[0].url;
        } else {
            return this.endpointConfig.production_endpoints.url;
        }
    }

    getSandboxEndpoint() {
        if (!this.endpointConfig.sandbox_endpoints) {
            return '';
        }
        if (Array.isArray(this.endpointConfig.sandbox_endpoints)) {
            return this.endpointConfig.sandbox_endpoints[0].url;
        } else {
            return this.endpointConfig.sandbox_endpoints.url;
        }
    }

    /**
     * Tests the endpoints
     */
    testEndpoint(endpointUrl, apiId) {
        return this.client.then(client => {
            return client.apis['Validation'].validateEndpoint({ endpointUrl: endpointUrl, apiId: apiId });
        });
    }

    save(openAPIVersion = 'v3') {
        const promisedAPIResponse = this.client.then(client => {
            const properties = client.spec.components.schemas.API.properties;
            const data = {};
            Object.keys(this).forEach(apiAttribute => {
                if (apiAttribute in properties) {
                    data[apiAttribute] = this[apiAttribute];
                }
            });
            const payload = {
                'Content-Type': 'application/json',
                openAPIVersion,
            };
            const requestBody = {
                'requestBody': data,
            };
            return client.apis['APIs'].createAPI(payload, requestBody, this._requestMetaData());
        });
        return promisedAPIResponse.then(response => {
            return new API(response.body);
        });
    }

    saveStreamingAPI() {
        const promisedAPIResponse = this.client.then(client => {
            const properties = client.spec.components.schemas.API.properties;
            const data = {};
            Object.keys(this).forEach(apiAttribute => {
                if (apiAttribute in properties) {
                    data[apiAttribute] = this[apiAttribute];
                }
            });

            const payload = {
                'Content-Type': 'application/json',
            };
            const requestBody = {
                'requestBody': data,
            };
            return client.apis['APIs'].createAPI(payload, requestBody, this._requestMetaData());
        });
        return promisedAPIResponse.then(response => {
            return new API(response.body);
        });
    }

    saveAPIDesignAssistant() {
        const promisedAPIResponse = this.client.then(client => {
            const properties = client.spec.components.schemas.API.properties;
            const data = {};
            Object.keys(this).forEach(apiAttribute => {
                if (apiAttribute in properties) {
                    data[apiAttribute] = this[apiAttribute];
                }
            });
            const payload = {
                'Content-Type': 'application/json'
            };
            const requestBody = {
                'requestBody': data,
            };
            return client.apis['APIs'].createAPI(payload, requestBody, this._requestMetaData());
        });
        return promisedAPIResponse.then(response => {
            return new API(response.body);
        });
    }

    sendChatAPIDesignAssistant(query, sessionId) {
        return this.client.then(client => {
            const data = {
                text: query,
                sessionId: sessionId
            };
            const payload = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const requestBody = {
                requestBody: data
            };
            return client.apis['API Design Assistant'].designAssistantChat(payload, requestBody, this._requestMetaData());
        }).then(response => {
            return response.body;
        }).catch(error => {
            throw error;
        });
    }

    payloadGenAPIDesignAssistant(sessionId) {
        return this.client.then(client => {
            const data = {
                sessionId: sessionId
            };
            const payload = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const requestBody = {
                requestBody: data
            };
            return client.apis['API Design Assistant'].designAssistantApiPayloadGen(payload, requestBody, this._requestMetaData());
        }).then(response => {
            return response.body;
        }).catch(error => {
            throw error;
        });
    }
    
    saveProduct() {
        const promisedAPIResponse = this.client.then(client => {
            const properties = client.spec.definitions.APIProduct.properties;
            const data = {};

            Object.keys(this).forEach(apiAttribute => {
                if (apiAttribute in properties) {
                    data[apiAttribute] = this[apiAttribute];
                }
            });
            const payload = {
                body: data,
                'Content-Type': 'application/json',
            };
            return client.apis['API Products'].createAPIProduct(payload, this._requestMetaData());
        });
        return promisedAPIResponse.then(response => {
            return new API(response.body);
        });
    }

    /**
     * Get details of a given API
     * @param id {string} UUID of the api.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     * @deprecated use static API.get() method instead
     */
    get(id, callback = null) {
        const promise_get = this.client.then(client => {
            return client.apis['APIs'].getAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_get.then(callback);
        } else {
            return promise_get;
        }
    }

    /**
     * Get details of a given API
     * @param id {string} UUID of the api.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     * @deprecated use static API.get() method instead
     */
    getProduct(id, callback = null) {
        const promise_get = this.client.then(client => {
            return client.apis['API Products'].getAPIProduct(
                {
                    apiProductId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_get.then(callback);
        } else {
            return promise_get;
        }
    }

    /**
     * Validate the api parameters for existence. (api name, context)
     * @param {string} query The parameters that should be validated.
     * @return {promise}
     * */
    validateAPIParameter(query) {
        return this.client.then(client => {
            return client.apis['Validation'].validateAPI({ query: query })
                .then(resp => {
                    return resp.ok;
                })
                .catch(err => {
                    console.log(err);
                    return false;
                });
        });
    }

    /**
     * Validate the given document name exists
     * @param {string} id The api id.
     * @param {string} name The document name
     * @return {promise}
     * */
    validateDocumentExists(id, name) {
        return this.client.then(client => {
            return client.apis['API Documents']
                .validateDocument({ apiId: id, name: name })
                .then(resp => {
                    return resp.ok;
                })
                .catch(err => {
                    console.log(err);
                    return false;
                });
        });
    }

    /**
     * Create a new version of a given API
     * @param version {string} new API version.
     * @param isDefaultVersion specifies whether new API version is set as default version
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    createNewAPIVersion(apiId, version, isDefaultVersion, serviceVersion, callback = null) {
        const promise_copy_api = this.client.then(client => {
            return client.apis['APIs'].createNewAPIVersion(
                {
                    apiId: this.id || apiId,
                    newVersion: version,
                    serviceVersion: serviceVersion,
                    defaultVersion: isDefaultVersion,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_copy_api.then(callback);
        } else {
            return promise_copy_api;
        }
    }


    /**
     * Create a new version of a given API Product
     * @param version {string} new API Product version.
     * @param isDefaultVersion specifies whether new API Product version is set as default version
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API Product invoke promise.
     */
     createNewAPIProductVersion(apiProductId, version, isDefaultVersion, callback = null) {
        const promise_copy_api_products = this.client.then(client => {
            return client.apis['API Products'].createNewAPIProductVersion(
                {
                    newVersion: version,
                    apiProductId: apiProductId,
                    defaultVersion: isDefaultVersion,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_copy_api_products.then(callback);
        } else {
            return promise_copy_api_products;
        }
    }

    /**
     * Get attached labels to an API
     *
     * @param apiId
     */
    getAPILabels(apiId) {
        const promise_api_labels = this.client.then(client => {
            const payload = {
                apiId: apiId,
                'Content-Type': 'multipart/form-data',
            };
            return client.apis['API Labels'].getLabelsOfAPI(
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promise_api_labels
    }

    /**
     * Attach labels to the given API
     *
     * @param apiId
     * @param addList
     */
    attachLabels(apiId, addList) {

        let promise_updated_labels;
        if (addList && addList.length !== 0) {
            promise_updated_labels = this.client.then(client => {
                const payload = {
                    apiId: apiId,
                    'Content-Type': 'multipart/form-data',
                };
                const requestBody = {
                    requestBody: {
                        labels: addList.map(label => label.id)
                    }
                }
                return client.apis['API Labels Attach'].attachLabelsToAPI(
                    payload,
                    requestBody,
                    this._requestMetaData({
                        'Content-Type': 'multipart/form-data',
                    }),
                );
            });
        }

        return promise_updated_labels;
    }

    /**
     * Detach labels to the given API
     *
     * @param apiId
     * @param deleteList
     */
    detachLabels(apiId, deleteList) {

        let promise_updated_labels;

        if (deleteList && deleteList.length !== 0) {
            promise_updated_labels = this.client.then(client => {
                const payload = {
                    apiId: apiId,
                    'Content-Type': 'multipart/form-data',
                };
                const requestBody = {
                    requestBody: {
                        labels: deleteList.map(label => label.id)
                    }
                }
                return client.apis['API Labels Detach'].detachLabelsFromAPI(
                    payload,
                    requestBody,
                    this._requestMetaData({
                        'Content-Type': 'multipart/form-data',
                    }),
                );
            });
        }

        return promise_updated_labels;
    }

    /**
     * Mock sample responses for Inline Prototyping
     * of a swagger OAS defintion
     *
     * @param id {String} The api id.
     */
    generateMockScripts(id = this.id) {
        const promise_get = this.client.then(client => {
            return client.apis['APIs'].generateMockScripts(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promise_get;
    }


    /**
     * Resets sample responses for inline prototyping
     *
     * @param {String} id
     */
    getGeneratedMockScriptsOfAPI(id = this.id) {
        const promise_get = this.client.then(client => {
            return client.apis['APIs'].getGeneratedMockScriptsOfAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promise_get;
    }


    /**
     * Get the graphQL schema of an API
     * @param id {String} UUID of the API in which the schema is needed
     * @param callback {function} Function which needs to be called upon success of the retrieving schema
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getSchema(id, callback = null) {
        const promise_get = this.client.then(client => {
            return client.apis['GraphQL Schema (Individual)'].getAPIGraphQLSchema(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_get.then(callback);
        } else {
            return promise_get;
        }
    }

    /**
     * Get all the scopes
     * @param offset {String} offset of the scopes list which needs to be retrieved
     * @param limit {String} limit of the scopes list which needs to be retrieved
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getAllScopes(offset = null, limit = null, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promise_scopes = apiClient.then(client => {
            return client.apis['Scopes'].getSharedScopes(
                { limit, offset },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_scopes.then(callback);
        } else {
            return promise_scopes;
        }
    }

    /**
     * Get settings of an API
     * @deprecated use the static getSettings method instead
     */
    getSettings() {
        const promisedSettings = this.client.then(client => {
            return client.apis['Settings'].getSettings();
        });
        return promisedSettings.then(response => response.body);
    }

    /**
     * Get Subscription Policies of an API
     * @param id {String} UUID of the API in which the swagger is needed
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getSubscriptionPolicies(id, isAiApi, callback = null) {
        const promisePolicies = this.client.then(client => {
            return client.apis['APIs'].getAPISubscriptionPolicies(
                {
                    apiId: id,
                    isAiApi,
                },
                this._requestMetaData(),
            );
        });
        return promisePolicies.then(response => response.body);
    }

    /**
     * Get monettization status of an API
     * @param id {String} UUID of the API in which the swagger is needed
     * @param callback {function} Function which needs to be called upon success of get Monetization status
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getMonetization(id, callback = null) {
        const promiseMonetization = this.client.then(client => {
            return client.apis['API Monetization'].getAPIMonetization(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promiseMonetization.then(response => response.body);
    }

    /**
     * Get monettization Invoice
     * @param id {String} UUID of the subscription
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getMonetizationInvoice(id, callback = null) {
        const promiseInvoice = this.client.then(client => {
            return client.apis['API Monetization'].getSubscriptionUsage(
                {
                    subscriptionId: id,
                },
                this._requestMetaData(),
            );
        });
        return promiseInvoice.then(response => response.body);
    }

    /**
     * configure monetization to an API
     * @param apiId APIID
     * @param body details of tiers
     */
    configureMonetizationToApi(apiId, body) {
        const promised_status = this.client.then(client => {
            return client.apis['API Monetization'].addAPIMonetization(
                { apiId },
                { requestBody: body },
            );
        });
        return promised_status;
    }

    /**
     * Get a particular scope
     * @param scopeId {String} UUID of the scope
     * @param callback {function} Function which needs to be called upon success of the scope retrieval
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getSharedScopeDetails(scopeId, callback = null) {
        const promise_scopes = this.client.then(client => {
            return client.apis['Scopes'].getSharedScope(
                { scopeId },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_scopes.then(callback);
        } else {
            return promise_scopes;
        }
    }

    /**
     * Get usages of a particular scope
     * @param scopeId {String} UUID of the scope
     * @param callback {function} Function which needs to be called upon success of the scope usage retrieval
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getSharedScopeUsages(scopeId, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promise_scopes = apiClient.then(client => {
            return client.apis['Scopes'].getSharedScopeUsages(
                { scopeId },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_scopes.then(callback);
        } else {
            return promise_scopes;
        }
    }

    /**
     * Add a shared scope
     * @param body {any} body of the shared scope details
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    addSharedScope(body) {
        const promised_addSharedScope = this.client.then(client => {
            const payload = {
                'Content-Type': 'application/json',
            };
            return client.apis['Scopes'].addSharedScope(
                payload,
                {
                    requestBody: body
                },
                this._requestMetaData()
            );
        });
        return promised_addSharedScope;
    }

    /**
     * Update a shared scope
     * @param scopeId {String} UUID of the scope
     * @param body {any} body of the shared scope details
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    updateSharedScope(scopeId, body) {
        const promised_updateSharedScope = this.client.then(client => {
            const payload = {
                scopeId,
                'Content-Type': 'application/json',
            };
            return client.apis['Scopes'].updateSharedScope(
                payload,
                {
                    requestBody: body
                },
                this._requestMetaData()
            );
        });
        return promised_updateSharedScope;
    }

    /**
     * Delete a shared scope
     * @param scopeId {String} UUID of the scope
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    deleteSharedScope(scopeId) {
        const promise_deleteScope = this.client.then(client => {
            return client.apis['Scopes'].deleteSharedScope(
                {
                    scopeId: scopeId,
                },
                this._requestMetaData(),
            );
        });
        return promise_deleteScope;
    }

    /**
     * Validate an open api definition.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     *
     */
     validateSwagger(swagger) {
        const promised_update = this.client.then(client => {
            const payload = {
                file: swagger,
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    file: swagger,
                },
            };
            return client.apis['Validation'].validateOpenAPIDefinition(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_update;
    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     * @deprecated
     */
    updateSwagger(id, swagger) {
        const promised_update = this.client.then(client => {
            const payload = {
                apiId: id,
                'Content-Type': 'multipart/form-data',
            };

            const requestBody = {
                requestBody: {
                    apiDefinition: JSON.stringify(swagger),
                }
            };
            return client.apis['APIs'].updateAPISwagger(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_update;
    }

    deleteSequenceBackend(keyType, apiId) {
        const promised_delete = this.client.then(client => {
            return client.apis['APIs'].sequenceBackendDelete(
                {
                    type: keyType,
                    apiId: apiId,
                },
                this._requestMetaData({
                
                }),
            );
        });
        return promised_delete; 
    }

    getSequenceBackends(apiId) {
        const promised_get = this.client.then(client => {
            return client.apis['APIs'].getSequenceBackendData(
                {
                    apiId: apiId,
                },
                this._requestMetaData({
                
                }),
            );
        });
        return promised_get; 
    }

    getSequenceBackendContentByAPIID(apiId, keyType) {
        const promised_get = this.client.then(client => {
            return client.apis['APIs'].getSequenceBackendContent(
                {
                    type: keyType,
                    apiId: apiId,
                },
                this._requestMetaData({
                
                }),
            );
        });
        return promised_get; 
    }

    uploadCustomBackend(customBackend, keyType, apiId) {
        const promised_update = this.client.then(client => {
            const payload = {
                apiId: apiId,
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    sequence: customBackend,
                    type: keyType,
                },
            };
            console.log('requestBody', requestBody);
            console.log('payload', payload);
            return client.apis['APIs'].sequenceBackendUpdate(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_update;
    }

    /**
     * Update API definition of a given API by URL content
     * @param apiId         API Identifier
     * @param openAPIUrl    OpenAPI definition content URL
     * @returns {boolean|*}
     */
    updateAPIDefinitionByUrl(apiId, openAPIUrl) {
        let payload, requestBody, promise_updated;

        promise_updated = this.client.then(client => {
            payload = {
                apiId,
                'Content-Type': 'multipart/form-data',
            };

            requestBody = {
                requestBody: {
                    url: openAPIUrl,
                }
            };

            const promisedResponse = client.apis['APIs'].updateAPISwagger(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_updated;
    }

    /**
     * Update API definition of a given API by file content
     * @param apiId         API Identifier
     * @param openAPIFile   OpenAPI definition file content
     * @returns {boolean|*}
     */
    updateAPIDefinitionByFile(apiId, openAPIFile) {
        let payload, requestBody, promise_updated;

        promise_updated = this.client.then(client => {
            payload = {
                apiId,
                'Content-Type': 'multipart/form-data',
            };

            requestBody = {
                requestBody: {
                    file: openAPIFile,
                }
            };

            const promisedResponse = client.apis['APIs'].updateAPISwagger(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_updated;
    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param apiId {Object} Updated graphQL schema which needs to be updated
     * @param graphQLSchema
     */
    updateGraphQLAPIDefinition(apiId, graphQLSchema) {
        const promised_updateSchema = this.client.then(client => {
            const payload = {
                apiId: apiId,
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    schemaDefinition: graphQLSchema
                }
            }
            return client.apis['GraphQL Schema'].updateAPIGraphQLSchema(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_updateSchema;
    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     *
     */
    updateSwagger(swagger) {
        const promised_update = this.client.then(client => {
            const payload = {
                apiId: this.id,
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    apiDefinition: JSON.stringify(swagger),
                },
            };
            return client.apis['APIs'].updateAPISwagger(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_update;
    }

    /**
     * Delete the current api instance
     * @param id {String} UUID of the API which want to delete
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    delete() {
        return this.client.then(client => {
            return client.apis['APIs'].deleteAPI(
                {
                    apiId: this.id,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Delete the current api product instance
     * @param id {String} UUID of the API which want to delete
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    deleteProduct() {
        return this.client.then(client => {
            return client.apis['API Products'].deleteAPIProduct(
                {
                    apiProductId: this.id,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the life cycle state of an API given its id (UUID)
     * @param id {string} UUID of the api
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    getLcState(id, callback = null) {
        const promise_lc_get = this.client.then(client => {
            return client.apis['API Lifecycle'].getAPILifecycleState(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_lc_get.then(callback);
        } else {
            return promise_lc_get;
        }
    }

    /**
     * Get the life cycle history data of an API given its id (UUID)
     * @param id {string} UUID of the api
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    getLcHistory(id, callback = null) {
        const promise_lc_history_get = this.client.then(client => {
            return client.apis['API Lifecycle'].getAPILifecycleHistory(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_lc_history_get.then(callback);
        } else {
            return promise_lc_history_get;
        }
    }

    /**
     *
     * Shortcut method to publish `this` API instance
     *
     * @param {Object} checkedItems State change checklist items
     * @returns {Promise}
     * @memberof API
     */
    publish(checkedItems) {
        const payload = {
            action: 'Publish',
            apiId: this.id,
            lifecycleChecklist: checkedItems,
            'Content-Type': 'application/json',
        };
        return this.client.then(client => {
            return client.apis['API Lifecycle'].changeAPILifecycle(payload, this._requestMetaData());
        });
    }

    /**
     * Update the life cycle state of an API given its id (UUID)
     * @param id {string} UUID of the api
     * @param state {string} Target state which need to be transferred
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    updateLcState(id, state, checkedItems, callback = null) {
        const payload = {
            action: state,
            apiId: id,
            lifecycleChecklist: checkedItems,
            'Content-Type': 'application/json',
        };
        const promise_lc_update = this.client.then(client => {
            return client.apis['API Lifecycle'].changeAPILifecycle(payload, this._requestMetaData());
        });
        if (callback) {
            return promise_lc_update.then(callback);
        } else {
            return promise_lc_update;
        }
    }

    /**
     * Cleanup pending workflow state change task for API given its id (UUID)
     * @param id {string} UUID of the api
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    cleanupPendingTask(id, callback = null) {
        const promise_deletePendingTask = this.client.then(client => {
            return client.apis['API Lifecycle'].deleteAPILifecycleStatePendingTasks(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promise_deletePendingTask;
    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     */
    update(updatedProperties) {
        const updatedAPI = { ...this.toJSON(), ...updatedProperties };
        const promisedUpdate = this.client.then(client => {
            const payload = {
                apiId: updatedAPI.id,
            };
            const requestBody = {
                requestBody: updatedAPI,
            };
            return client.apis['APIs'].updateAPI(payload, requestBody);
        });
        return promisedUpdate.then(response => {
            return new API(response.body);
        });
    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     */
    updateProduct(api) {
        const promised_update = this.client.then(client => {
            const payload = {
                apiProductId: api.id,
            };
            const requestBody = {
                'requestBody': api,
            };
            return client.apis['API Products'].updateAPIProduct(payload, requestBody);
        });
        return promised_update;
    }
    /**
     * Get the available subscriptions for a given API
     * @param {String} apiId API UUID
     * @returns {Promise} With given callback attached to the success chain else API invoke promise.
     */
    subscriptions(apiId, offset = null, limit = null, query = null, callback = null) {
        const promise_subscription = this.client.then(client => {
            return client.apis['Subscriptions'].getSubscriptions(
                { apiId, limit, offset, query },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_subscription.then(callback);
        } else {
            return promise_subscription;
        }
    }
    /**
     * Block subscriptions for given subscriptionId
     * @param {String} id Subscription UUID
     * @param {String} state Subscription status
     * @returns {Promise} With given callback attached to the success chain else API invoke promise.
     */
    blockSubscriptions(id, state, callback = null) {
        const promise_subscription = this.client.then(client => {
            return client.apis['Subscriptions'].blockSubscription(
                {
                    subscriptionId: id,
                    blockState: state,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_subscription.then(callback);
        } else {
            return promise_subscription;
        }
    }

    /**
     * Unblock subscriptions for given subscriptionId
     * @param {String} id Subscription UUID
     * @returns {Promise} With given callback attached to the success chain else API invoke promise.
     */
    unblockSubscriptions(id, callback = null) {
        const promise_subscription = this.client.then(client => {
            return client.apis['Subscriptions'].unBlockSubscription(
                {
                    subscriptionId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_subscription.then(callback);
        } else {
            return promise_subscription;
        }
    }

    /**
     * Retrieve subscriber information for a given subscriptionId
     * @param {String} id Subscription UUID
     * @returns {Promise} With given callback attached to the success chain else API invoke promise.
     */
    getSubscriberInfo(id) {
        const promise_subscription = this.client.then(client => {
            return client.apis['Subscriber'].getSubscriberInfoBySubscriptionId(
                {
                    subscriptionId: id,
                },
                this._requestMetaData(),
            );
        });
        return promise_subscription;
    }

    /**
     * Get all Organizations of the given tenant
     * @return {Promise}
     * */
    organizations() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis["Organizations"].get_organizations(
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get user organization information
     */
    getUserOrganizationInfo() {
        return this.client.then((client) => {
            return client.apis.Users.organizationInformation(this._requestMetaData());
        });
    }

    addDocument(api_id, body) {
        const promised_addDocument = this.client.then(client => {
            const payload = {
                apiId: api_id,
                'Content-Type': 'application/json',
            };
            const requestBody = {
                requestBody: body
            };
            return client.apis['API Documents'].addAPIDocument(payload, requestBody,
                this._requestMetaData());
        });
        return promised_addDocument;
    }

    /*
     Add a File resource to a document
     */
    addFileToDocument(api_id, docId, fileToDocument) {
        const promised_addFileToDocument = this.client.then(client => {
            const payload = {
                apiId: api_id,
                documentId: docId,
                'Content-Type': 'application/json',
            };
            return client.apis['API Documents'].addAPIDocumentContent(
                payload,
                {
                    requestBody: {
                        file: fileToDocument
                    }
                },
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });

        return promised_addFileToDocument;
    }

    /*
     Add inline content to a INLINE type document
     */
    addInlineContentToDocument(apiId, documentId, sourceType, inlineContent) {
        const promised_addInlineContentToDocument = this.client.then(client => {
            const payload = {
                apiId,
                documentId,
                sourceType,
                'Content-Type': 'application/json',
            };
            const requestBody = {
                requestBody: {
                    inlineContent: inlineContent,
                }
            };
            return client.apis['API Documents'].addAPIDocumentContent(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_addInlineContentToDocument;
    }

    getFileForDocument(api_id, docId) {
        const promised_getDocContent = this.client.then(client => {
            const payload = {
                apiId: api_id,
                documentId: docId,
                Accept: 'application/octet-stream',
            };
            return client.apis['API Documents'].getAPIDocumentContentByDocumentId(
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_getDocContent;
    }

    /*
     Get the inline content of a given document
     */
    getInlineContentOfDocument(api_id, docId) {
        const promised_getDocContent = this.client.then(client => {
            const payload = {
                apiId: api_id,
                documentId: docId,
            };
            return client.apis['API Documents'].getAPIDocumentContentByDocumentId(payload);
        });
        return promised_getDocContent;
    }

    getDocuments(api_id, callback) {
        const limit = Configurations.app.documentCount || 80;
        const promise_get_all = this.client.then(client => {
            return client.apis['API Documents'].getAPIDocuments(
                {
                    apiId: api_id,
                    limit,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promise_get_all.then(callback);
        } else {
            return promise_get_all;
        }
    }

    updateDocument(api_id, docId, body) {
        const promised_updateDocument = this.client.then(client => {
            const payload = {
                apiId: api_id,
                documentId: docId,
                'Content-Type': 'application/json',
            };
            return client.apis['API Documents'].updateAPIDocument(
                payload,
                {
                    requestBody: body,
                },
                this._requestMetaData(),
            );
        });
        return promised_updateDocument;
    }

    getDocument(api_id, docId, callback) {
        const promise_get = this.client.then(client => {
            return client.apis['API Documents'].getAPIDocumentByDocumentId(
                {
                    apiId: api_id,
                    documentId: docId,
                },
                this._requestMetaData(),
            );
        });
        return promise_get;
    }

    deleteDocument(api_id, document_id) {
        const promise_deleteDocument = this.client.then(client => {
            return client.apis['API Documents'].deleteAPIDocument(
                {
                    apiId: api_id,
                    documentId: document_id,
                },
                this._requestMetaData(),
            );
        });
        return promise_deleteDocument;
    }

    /**
     * Get the available labels.
     * @returns {Promise.<TResult>}
     * TODO: remove
     */
    labels() {
        const promise_labels = this.client.then(client => {
            return client.apis['Label (Collection)'].getLabels({}, this._requestMetaData());
        });
        return promise_labels;
    }

    /**
     * Create an API from GraphQL with the given parameters and call the callback method given optional.
     * @param {Object} api_data - API data which need to fill the placeholder values in the @get_template
     * @param {function} callback - An optional callback method
     * @returns {Promise} Promise after creating and optionally calling the callback method.
     */
    importGraphQL(api_data, callback = null) {
        let payload;
        let promise_create;
        payload = {
            'Content-Type': 'multipart/form-data',
        };
        const requestBody = {
            requestBody: {
                type: 'GraphQL',
                additionalProperties: api_data.additionalProperties,
                ...(api_data.file !== undefined
                    ? { file: api_data.file }
                    : { schema: api_data.schema }),
            }
        };

        promise_create = this.client.then(client => {
            return client.apis['APIs'].importGraphQLSchema(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        if (callback) {
            return promise_create.then(callback);
        } else {
            return promise_create;
        }
    }

    static validateGraphQLFile(file) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promised_validationResponse = apiClient.then(client => {
            return client.apis['Validation'].validateGraphQLSchema(
                {
                    type: 'GraphQL',
                    'Content-Type': 'multipart/form-data',
                },
                {
                    requestBody: {
                        file,
                    }
                },
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_validationResponse;
    }

    static validateGraphQL(url, params = { useIntrospection: false }) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promised_validationResponse = apiClient.then(client => {
            return client.apis['Validation'].validateGraphQLSchema(
                {
                    type: 'GraphQL',
                    'Content-Type': 'multipart/form-data',
                    ...params
                },
                {
                    requestBody: {
                        url,
                    }
                },
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_validationResponse;
    }

    /**
     * Downloads the WSDL of an API
     *
     * @param {string} apiId Id (UUID) of the API
     */
    getWSDL(apiId) {
        const promised_wsdlResponse = this.client.then(client => {
            return client.apis['APIs'].getWSDLOfAPI(
                {
                    apiId,
                },
                this._requestMetaData(),
            );
        });
        return promised_wsdlResponse;
    }

    /**
     * Get WSDL meta info of an API - indicates whether the WSDL is a ZIP or a single file.
     *
     * @param {string} apiId Id (UUID) of the API
     */
    getWSDLInfo(apiId) {
        const promised_wsdlResponse = this.client.then(client => {
            return client.apis['APIs'].getWSDLInfoOfAPI(
                {
                    apiId,
                },
                this._requestMetaData(),
            );
        });
        return promised_wsdlResponse;
    }

    /**
     * Updates the API's WSDL with the WSDL of the provided URL
     *
     * @param {string} apiId Id (UUID) of the API
     * @param {string} url WSDL url
     */
    updateWSDLByUrl(apiId, url) {
        const promised_wsdlResponse = this.client.then(client => {
            return client.apis['APIs'].updateWSDLOfAPI(
                {
                    apiId,
                },
                {
                    requestBody: {
                        url,
                    }
                },
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_wsdlResponse;
    }

    /**
     * Updates the API's WSDL with the WSDL of the provided file (zip or .wsdl)
     *
     * @param {string} apiId Id (UUID) of the API
     * @param {*} file WSDL file (zip or .wsdl)
     */
    updateWSDLByFileOrArchive(apiId, file) {
        const promised_wsdlResponse = this.client.then(client => {
            return client.apis['APIs'].updateWSDLOfAPI(
                {
                    apiId,
                },
                {
                    requestBody: {
                        file,
                    }
                },
                this._requestMetaData(),
            );
        });
        return promised_wsdlResponse;
    }

    /**
     * Get all threat protection policies
     * TODO: remove
     */
    getThreatProtectionPolicies() {
        const promisedPolicies = this.client.then(client => {
            return client.apis['Threat Protection Policies'].get_threat_protection_policies();
        });
        return promisedPolicies;
    }

    /**
     * Retrieve a single threat protection policy
     * @param id Threat protection policy id
     * TODO: remove
     */
    getThreatProtectionPolicy(id) {
        const promisedPolicies = this.client.then(client => {
            return client.apis['Threat Protection Policy'].get_threat_protection_policies__policyId_({
                policyId: id,
            });
        });
        return promisedPolicies;
    }

    /**
     * Add threat protection policy to an API
     * @param apiId APIID
     * @param policyId Threat protection policy id
     * TODO: remove
     */
    addThreatProtectionPolicyToApi(apiId, policyId) {
        const promisedPolicies = this.client.then(client => {
            return client.apis['API (Individual)'].post_apis__apiId__threat_protection_policies({
                apiId,
                policyId,
            });
        });
        return promisedPolicies;
    }

    /**
     * Delete threat protection policy from an API
     * @param apiId APIID
     * @param policyId Threat protection policy id
     * TODO: remove
     */
    deleteThreatProtectionPolicyFromApi(apiId, policyId) {
        console.log(apiId);
        const promisedDelete = this.client.then(client => {
            console.log(client.apis);
            return client.apis['API (Individual)'].delete_apis__apiId__threat_protection_policies({
                apiId,
                policyId,
            });
        });
        return promisedDelete;
    }

    /**
     * Get the thumnail of an API
     *
     * @param id {string} UUID of the api
     */
    getAPIThumbnail(id) {
        const promised_getAPIThumbnail = this.client.then(client => {
            return client.apis['APIs'].getAPIThumbnail(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });

        return promised_getAPIThumbnail;
    }

    validateSystemRole(role) {
        const promise = this.client.then(client => {
            return client.apis.Roles.validateSystemRole({ roleId: role });
        });
        return promise;
    }

    validateUSerRole(role) {
        const promise = this.client.then(client => {
            return client.apis.Roles.validateUserRole({ roleId: role });
        });
        return promise;
    }

    validateScopeName(name) {
        const promise = this.client.then(client => {
            return client.apis['Scopes'].validateScope({ scopeId: name });
        });
        return promise;
    }

    /**
     * Add new thumbnail image to an API
     *
     * @param {String} api_id id of the API
     * @param {File} imageFile thumbnail image to be uploaded
     */
    addAPIThumbnail(api_id, imageFile) {
        const promised_addAPIThumbnail = this.client.then(client => {
            const payload = {
                apiId: api_id,
                'Content-Type': imageFile.type,
            };
            const requestBody = {
                requestBody: {
                    file: imageFile,
                },
            };
            return client.apis['APIs'].updateAPIThumbnail(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });

        return promised_addAPIThumbnail;
    }

    /**
     * Get all replies for a particular comment
     * @param {string} apiId api id of the api for which the comment is added
     * @param {string} commentId id of the comment
     * @param {string} limit number of replies to retrieve
     * @param {string} offset the starting point of replies
     * @returns {promise} promise
     */
    getAllCommentReplies(apiId, commentId, limit, offset) {
        return this.client.then((client) => {
            return client.apis.Comments.getRepliesOfComment({
                commentId, apiId, limit, offset,
            }, this._requestMetaData());
        });
    }

    /**
     * Delete a comment belongs to a particular API
     * @param apiId api id of the api to which the comment belongs to
     * @param commentId comment id of the comment which has to be deleted
     * * TODO: remove
     */
    deleteComment(apiId, commentId, callback = null) {
        let promise = this.client
            .then(client => {
                return client.apis['Comment (Individual)'].delete_apis__apiId__comments__commentId_(
                    { apiId: apiId, commentId: commentId },
                    this._requestMetaData(),
                );
            })
            .catch(error => {
                console.error(error);
            });
        if (callback) {
            return promise.then(callback);
        } else {
            return promise;
        }
    }

    /**
     * Update a comment belongs to a particular API
     * @param apiId apiId of the api to which the comment is added
     * @param commentId comment id of the comment which has to be updated
     * @param commentInfo comment text
     * TODO: remove
     */
    updateComment(apiId, commentId, commentInfo, callback = null) {
        let promise = this.client
            .then(client => {
                return client.apis['Comment (Individual)'].put_apis__apiId__comments__commentId_(
                    { apiId: apiId, commentId: commentId, body: commentInfo },
                    this._requestMetaData(),
                );
            })
            .catch(error => {
                console.error(error);
            });
        if (callback) {
            return promise.then(callback);
        } else {
            return promise;
        }
    }

    /**
     *
     * To get API object with the fields filled as per the definition
     * @param {Object} client Client object after resolving this.client.then()
     * @returns API Object corresponding to spec fields
     * @memberof API
     */
    getDataFromSpecFields(client) {
        const properties = client.spec.components.schemas.API.properties;
        const data = {};
        Object.keys(this).forEach(apiAttribute => {
            if (apiAttribute in properties) {
                data[apiAttribute] = this[apiAttribute];
            }
        });
        return data;
    }

    /**
     * Get all active Tenants
     * @param state state of the tenant
     */
    getTenantsByState(state) {
        return this.client.then(client => {
            return client.apis['Tenants'].getTenantsByState({ state });
        });
    }

    /**
     * Get the complexity related details of an API
     */

    getGraphqlPoliciesComplexity(id) {
        const promisePolicies = this.client.then(client => {
            return client.apis['GraphQL Policies'].getGraphQLPolicyComplexityOfAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promisePolicies.then(response => response.body);
    }

    /**
     * Update complexity related details of an API
     */
    updateGraphqlPoliciesComplexity(api_id, body) {
        const promised_updateComplexity = this.client.then(client => {
            const payload = {
                apiId: api_id,
                'Content-Type': 'application/json',
            };
            return client.apis['GraphQL Policies'].updateGraphQLPolicyComplexityOfAPI(
                payload,
                { requestBody: body },
                this._requestMetaData(),
            );
        });
        return promised_updateComplexity;
    }

    /**
     * Retrieve all types and fields of a GraphQL Schema
     */
    getGraphqlPoliciesComplexityTypes(id) {
        const promisePolicies = this.client.then(client => {
            return client.apis['GraphQL Policies'].getGraphQLPolicyComplexityTypesOfAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promisePolicies.then(response => response.body);
    }



    /**
     *
     * Static method for get all APIs for current environment user.
     * @static
     * @param {Object} params APIs filtering parameters i:e { "name": "MyBank API"}
     * @returns {Promise} promise object return from SwaggerClient-js
     * @memberof API
     */
    static all(params) {
        let updatedQuery = '';
        if (params && 'query' in params) {
            Object.entries(params.query).forEach(([key, value], index) => {
                let property = `${key}:${value}`;
                updatedQuery += property;
                if (Object.entries(params.query).length !== index + 1) {
                    updatedQuery += ' ';
                }
            });
        }
        params.query = updatedQuery;
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedAPIs = apiClient.then(client => {
            return client.apis['APIs'].getAllAPIs(params, Resource._requestMetaData());
        });

        return promisedAPIs.then(response => {
            response.obj.apiType = API.CONSTS.API;
            return response;
        });
    }

    /**
     *
     * Static method for get all API products for current environment user.
     * @static
     * @param {Object} params APIs filtering parameters i:e { "name": "MyBank API"}
     * @returns {Promise} promise object return from SwaggerClient-js
     * @memberof API
     */
    static allProducts(params) {
        let query = '';
        if (params && 'query' in params) {
            for (const [key, value] of Object.entries(params.query)) {
                query += `${key}:${value},`;
            }
            params.query = query;
        }
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['API Products'].getAllAPIProducts(params, Resource._requestMetaData());
        });
    }

    /**
    * Get details of a given API
    * @param id {string} UUID of the api.
    * @param callback {function} A callback function to invoke after receiving successful response.
    * @returns {promise} With given callback attached to the success chain else API invoke promise.
    */
    static getAPIById(id, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promiseGet = apiClient.then((client) => {
            return client.apis.APIs.getAPI({ apiId: id }, this._requestMetaData());
        });
        if (callback) {
            return promiseGet.then(callback);
        } else {
            return promiseGet;
        }
    }

    /**
     * Generate Internal Key
     * @param id {string} UUID of the api.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static generateInternalKey(id, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promiseKey = apiClient.then((client) => {
            return client.apis.APIs.generateInternalAPIKey({ apiId: id }, this._requestMetaData());
        });
        if (callback) {
            return promiseKey.then(callback);
        } else {
            return promiseKey;
        }
    }

    /**
     * Get keys of an application
     * @param applicationId id of the application that needs to get the keys
     * @param callback {function} Function which needs to be called upon success
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getSubscriptions(apiId, applicationId, callback = null) {
        const payload = { apiId };
        if (applicationId) {
            payload[applicationId] = applicationId;
        }
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedGet = apiClient.then((client) => {
            return client.apis.Subscriptions.getSubscriptions(payload, this._requestMetaData());
        });
        if (callback) {
            return promisedGet.then(callback);
        } else {
            return promisedGet;
        }
    }

    /**
     * Get the swagger of an API
     * @param apiId {String} UUID of the API in which the swagger is needed
     * @param labelName {String} Micro gateway label
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getSwaggerByAPIIdAndLabel(apiId, labelName, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promiseGet = apiClient.then((client) => {
            return client.apis.APIs.getAPISwagger({ apiId, labelName }, this._requestMetaData());
        });
        if (callback) {
            return promiseGet.then(callback);
        } else {
            return promiseGet;
        }
    }

    /**
     * Get the swagger of an API
     * @param apiId {String} UUID of the API in which the swagger is needed
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    getSwagger(id = this.id, environmentName = '') {
        const payload = { apiId: id };
        if (environmentName) {
            payload[environmentName] = environmentName;
        }
        return this.client.then((client) => {
            return client.apis.APIs.getAPISwagger(payload, this._requestMetaData());
        });
    }

    /**
     * Update the life cycle state of an API given its id (UUID)
     * @param id {string} UUID of the api
     * @param state {string} Target state which need to be transferred
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    static updateLcState(id, state, checkedItems, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const payload = {
            action: state,
            apiId: id,
            lifecycleChecklist: checkedItems,
            'Content-Type': 'application/json',
        };
        const promise_lc_update = apiClient.then(client => {
            return client.apis['API Lifecycle'].changeAPILifecycle(payload, this._requestMetaData());
        });
        if (callback) {
            return promise_lc_update.then(callback);
        } else {
            return promise_lc_update;
        }
    }

    /**
     * Get details of a given API
     * @param id {string} UUID of the api.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static get(id, callback = null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedAPI = apiClient.then(client => {
            return client.apis['APIs'].getAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        if (callback) {
            return promisedAPI.then(callback);
        } else {
            return promisedAPI;
        }

    }

    /**
     * Update an api via PUT HTTP method, Need to give the updated API object as the argument.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     */
    static update(updatedProperties, callback = null) {
        console.log('API factory');
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const updatedAPI = updatedProperties;
        console.log('updated api' + JSON.stringify(updatedAPI));
        const promisedUpdate = apiClient.then(client => {
            const payload = {
                apiId: updatedAPI.id,
                body: updatedAPI,
            };
            return client.apis['APIs'].updateAPI(payload);
        });
        if (callback) {
            return promisedUpdate.then(callback);
            console.log('promised update' + JSON.stringify(promisedUpdate));
        } else {
            return promisedUpdate;
            console.log('promised update' + JSON.stringify(promisedUpdate));
        }
    }

    /**
     * Get settings of an API
     */
    static getSettings() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedSettings = apiClient.then(client => {
            return client.apis['Settings'].getSettings();
        });
        return promisedSettings.then(response => response.body);
    }

    /**
     * Get the list of custom rules (Custom linter rules in the tenant config and applicable governance rulesets)
     */
    static getLinterCustomRules(params) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedLinterCustomeRules = apiClient.then(client => {
            return client.apis['Linter Custom Rules'].getLinterCustomRules(params);
        });
        return promisedLinterCustomeRules.then(response => response.body);
    }

    /**
     *
     * Static method to search apis and documents based on content
     * @static
     * @param {Object} params APIs, Documents filtering parameters i:e { "name": "MyBank API"}
     * @returns {Promise} promise object return from SwaggerClient-js
     * @memberof API
     */
    static search(params) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Unified Search'].search(params, Resource._requestMetaData());
        });
    }

    /**
     * Get list of revisions.
     *
     * @param {string} apiId Id of the API.
     * */
    getRevisions(apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['API Revisions'].getAPIRevisions({
                apiId: apiId,
            },
            );
        });
    }

    /**
     * Get list of revisions with environments.
     *
     * @param {string} apiId Id of the API.
     * */
    getRevisionsWithEnv(apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['API Revisions'].getAPIRevisions(
                {
                    apiId: apiId,
                    query: 'deployed:true',
                },
            );
        });
    }

    /**
     * Return the deployed revisions of this API
     * @returns
     */
    getDeployedRevisions() {
        if (this.isRevision) {
            return this.client.then(client => {
                return client.apis['API Revisions'].getAPIRevisionDeployments({
                    apiId: this.revisionedApiId,
                },
                ).then(res => {
                    return { body: res.body.filter(a => a.revisionUuid === this.id) }
                });
            });
        }
        return this.client.then(client => {
            return client.apis['API Revisions'].getAPIRevisionDeployments({
                apiId: this.id,
            },
            );
        });
    }

    /**
     * Add revision.
     *
     * @param {string} apiId Id of the API.
     * @param {Object} body Revision Object.
     * */
    createRevision(apiId, body) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].createAPIRevision(
                    { apiId: apiId },
                    { requestBody: body },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Delete revision.
     *
     * @param {string} apiId Id of the API.
     * @param {Object} body Revision Object.
     * */
    deleteRevision(apiId, revisionId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].deleteAPIRevision(
                    {
                        apiId: apiId,
                        revisionId: revisionId
                    },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Undeploy revision.
     *
     * @param {string} apiId Id of the API.
     * @param {Object} body Revision Object.
     * */
    undeployRevision(apiId, revisionId, body) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].undeployAPIRevision(
                    {
                        apiId: apiId,
                        revisionId: revisionId
                    },
                    { requestBody: body },
                    this._requestMetaData(),
                );
            });
    }

    /**
    * Deploy revision.
    *
    * @param {string} apiId Id of the API.
    * @param {Object} body Revision Object.
    * */
    deployRevision(apiId, revisionId, body) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].deployAPIRevision(
                    {
                        apiId: apiId,
                        revisionId: revisionId
                    },
                    { requestBody: body },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Restore revision.
     *
     * @param {string} apiId Id of the API.
     * @param {Object} body Revision Object.
     * */
    restoreRevision(apiId, revisionId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].restoreAPIRevision(
                    {
                        apiId: apiId,
                        revisionId: revisionId
                    },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Cleanup pending workflow revision deployment task for API given its id (UUID) and revision id (UUID)
     * @param apiId {string} UUID of the api
     * @param revisionID {string} UUID of the revision
     * @param callback {function} Callback function which needs to be executed in the success call
     */
    cancelRevisionDeploymentWorkflow(apiId, revisionID, envName, callback = null) {
        const promise_deletePendingTask = this.client.then(client => {
            return client.apis['API Revisions'].deleteAPIRevisionDeploymentPendingTask(
                {
                    apiId: apiId,
                    revisionId: revisionID,
                    envName: envName
                },
                this._requestMetaData(),
            );
        });
        return promise_deletePendingTask;
    }

    /**
     * Change displayInDevportal.
     *
     * @param {string} apiId Id of the API.
     * @param {string} deploymentId Id of the deployment.
     * @param {Object} body Revision Object.
     * */
    displayInDevportalAPI(apiId, deploymentId, body) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['API Revisions'].updateAPIDeployment(
                    {
                        apiId: apiId,
                        deploymentId: deploymentId
                    },
                    { requestBody: body },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Create API from service
     * @returns {promise} Add response.
     */
    static createApiFromService(serviceKey, apiMetaData, type) {
        if (type != '') {
            apiMetaData['type'] = type;
        }
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedServiceResponse = apiClient.then(client => {
            return client.apis['APIs'].importServiceFromCatalog(
                {
                    serviceKey: serviceKey,
                },
                { requestBody: apiMetaData },
                this._requestMetaData()
            );
        });
        return promisedServiceResponse.then(response => response.body);
    }

    /**
    * Reimport service.
    *
    * @param {string} apiId Id of the API.
    * */
    static reimportService(apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['APIs'].reimportServiceFromCatalog(
                    {
                        apiId: apiId,
                    },
                    this._requestMetaData(),
                );
            });
    }

    /**
     * Create new version service.
     *
     * @param {string} apiId Id of the API.
     * */
    static newVersionService(apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['APIs'].reimportServiceFromCatalog(
                    {
                        apiId: apiId,
                    },
                    this._requestMetaData(),
                );
            });
    }


    /**
     * Get details of a given API
     * @param id {string} UUID of the api.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static get(id) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedAPI = apiClient.then(client => {
            return client.apis['APIs'].getAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promisedAPI.then(response => {
            return new API(response.body);
        });
    }

    /**
     * Get details of a given API Product
     * @param id {string} UUID of the api product.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getProduct(id) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const promisedAPI = apiClient.then(client => {
            return client.apis['API Products'].getAPIProduct(
                {
                    apiProductId: id,
                },
                this._requestMetaData(),
            );
        });
        return promisedAPI.then(response => {
            return new API(response.body);
        });
    }

    /**
     *
     * Delete an API given its UUID
     * @static
     * @param {String} id API UUID
     * @returns {Promise} Swagger-Js promise object resolve to NT response object
     * @memberof API
     */
    static delete(id) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['APIs'].deleteAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     *
     * Delete an API Product given its UUID
     * @static
     * @param {String} id API Product UUID
     * @returns {Promise} Swagger-Js promise object resolve to NT response object
     * @memberof API
     */
    static deleteProduct(id) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['API Products'].deleteAPIProduct(
                {
                    apiProductId: id,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the available policies information by tier level.
     * @param {String} policyLevel List API or Application or Resource type policies.parameter should be one
     * of api, application, subscription and resource
     * @param limit
     * @returns {Promise}
     *
     */
    static policies(policyLevel, limit, isAiApi, organizationId ) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Throttling Policies'].getAllThrottlingPolicies(
                {
                    policyLevel: policyLevel,
                    limit,
                    isAiApi,
                    organizationId,
                },
                this._requestMetaData(),
            );
        });
    }

    static asyncAPIPolicies() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Throttling Policies'].getSubscriptionThrottlingPolicies(
                null,
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get all the endpoint certificates.
     * */
    static getEndpointCertificates(params) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            if (params) {
                return client.apis['Endpoint Certificates'].getEndpointCertificates(params);
            } else {
                return client.apis['Endpoint Certificates'].getEndpointCertificates();
            }
        });
    }

    /**
     * Upload endpoint certificate.
     *
     * @param {any} certificateFile The certificate file to be uploaded.
     * @param {string} endpoint The certificate endpoint.
     * @param {string} alias The certificate alias.
     * */
    static addCertificate(certificateFile, endpoint, alias) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['Endpoint Certificates'].addEndpointCertificate(
                    {},
                    {
                        requestBody: {
                            certificate: certificateFile,
                            endpoint: endpoint,
                            alias: alias,
                        }
                    });
            },
            this._requestMetaData({
                'Content-Type': 'multipart/form-data',
            }),
        );
    }

    /**
     * Upload endpoint certificate.
     *
     * @param {string} apiId API UUID
     * @param {any} certificateFile The certificate file to be uploaded.
     * @param {string} keyType The type of the endpoint (Whether production or sandbox)
     * @param {string} tier The tier the certificate needs to be associated.
     * @param {string} alias The certificate alias.
     * */
    static addClientCertificate(apiId, certificateFile, keyType, tier, alias) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['Client Certificates'].addAPIClientCertificateOfGivenKeyType(
                    {
                        keyType: keyType,
                        apiId: apiId,
                    },
                    {
                        requestBody: {
                            certificate: certificateFile,
                            alias: alias,
                            tier: tier,
                        }
                    }
                );
            },
            this._requestMetaData({
                'Content-Type': 'multipart/form-data',
            }),
        );
    }

    /**
     * Get all certificates for a particular API.
     *
     * @param apiId api id of the api to which the certificate is added
     * @param keyType of the certificates
     */
    static getAllClientCertificatesOfGivenKeyType(keyType, apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(
            client => {
                return client.apis['Client Certificates'].getAPIClientCertificatesByKeyType(
                    {
                    keyType: keyType,
                    apiId: apiId
                    },
                    this._requestMetaData(),
                );
            },
            this._requestMetaData({
                'Content-Type': 'multipart/form-data',
            }),
        );
    }

    /**
     * Get the status of the client certificate which matches the given alias and key type.
     *
     * @param {string} keyType The key type of the certificate which the information required.
     * @param {string} alias The alias of the certificate which the information required.
     * @param apiId api id of the api of which the certificate is retrieved.
     * */
    static getClientCertificateStatus(keyType, alias, apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Client Certificates'].getAPIClientCertificateByKeyTypeAndAlias({
                keyType,
                alias,
                apiId,
            });
        }, this._requestMetaData());
    }

    /**
     * Delete the client certificate which represented by the given alias.
     *
     * @param {string} keyType The key type of the certificate.
     * @param {string} alias The alias of the certificate.
     * @param apiId api id of the api of which the certificate is deleted.
     * */
    static deleteClientCertificate(keyType, alias, apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Client Certificates'].deleteAPIClientCertificateByKeyTypeAndAlias({
                keyType,
                alias,
                apiId,
            });
        }, this._requestMetaData());
    }

    /**
     * Get the status of the endpoint certificate which matches the given alias.
     *
     * @param {string} alias The alias of the certificate which the information required.
     * */
    static getCertificateStatus(alias) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Endpoint Certificates'].getEndpointCertificateByAlias({
                alias: alias,
            });
        }, this._requestMetaData());
    }

    /**
     * Delete the endpoint certificate which represented by the given alias.
     *
     * @param {string} alias The alias of the certificate
     * */
    static deleteEndpointCertificate(alias) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Endpoint Certificates'].deleteEndpointCertificateByAlias({
                alias,
            });
        }, this._requestMetaData());
    }

    /**
     * Get APIs that use a endpoint certificate which represented by the given alias.
     *
     * @param {string} alias The alias of the certificate
     * @param {string} limit number of replies to retrieve
     * @param {string} offset the starting point of replies
     * */
     static getEndpointCertificateUsage(alias, limit=null, offset=null) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['Endpoint Certificates'].getCertificateUsageByAlias({
                alias,
                limit,
                offset
            });
        }, this._requestMetaData());
    }

    /**
     * @static
     * Get all the external stores configured for the current environment
     * @returns {Promise}
     */
    static getAllExternalStores() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['External Stores'].getAllExternalStores(this._requestMetaData());
        });
    }

    /**
     * @static
     * Get published external stores for the given API
     * @param {String} apiId uuid
     * @returns {Promise}
     */
    static getPublishedExternalStores(apiId) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['External Stores'].getAllPublishedExternalStoresByAPI(
                { apiId: apiId },
                this._requestMetaData,
            );
        });
    }

    /**
     * @static
     * Publish the given API to given set of external stores and remove from others which are not specified
     * @param {String} apiId uuid
     * @param {Array} externalStoreIds
     */
    static publishAPIToExternalStores(apiId, externalStoreIds) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['External Stores'].publishAPIToExternalStores(
                {
                    apiId: apiId,
                    externalStoreIds: externalStoreIds.join(','),
                },
                this._requestMetaData,
            );
        });
    }

    /**
     * Get ARNs of an user role
     * @param id {string} UUID of the api product.
     * @param callback {function} A callback function to invoke after receiving successful response.
     * @returns {promise} With given callback attached to the success chain else API invoke promise.
     */
    static getAmznResourceNames(id) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis['AWS Lambda (Individual)'].getAmazonResourceNamesOfAPI(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * @static
     * Get all API Categories of the given tenant
     * @return {Promise}
     * */
    static apiCategories() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis["API Category (Collection)"].getAllAPICategories(
                this._requestMetaData(),
            );
        });
    }

    /**
     * @static
     * Get all Labels of the given tenant
     * @return {Promise}
     * */
    static labels() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis["Labels (Collection)"].getAllLabels(
                this._requestMetaData(),
            );
        });
    }


    /**
     * @static
     * Get all Organizations of the given tenant
     * @return {Promise}
     * */
    static getOrganizations() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis["Organizations"].get_organizations(
                this._requestMetaData(),
            );
        });
    }

    static keyManagers() {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            return client.apis["Key Managers (Collection)"].getAllKeyManagers(
                this._requestMetaData(),
            );
        });
    }

    static updateTopics(apiId, topics) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return apiClient.then(client => {
            const payload = {
                'Content-Type': 'application/json',
                apiId
            };
            const requestBody = {
                'requestBody': topics,
            };
            return client.apis["APIs"].updateTopics(payload, requestBody, this._requestMetaData());
        });
    }

    static validateAsyncAPIByFile(asyncAPIData) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        let payload, promisedValidate;
        payload = {
            file: asyncAPIData,
            'Content-Type': 'multipart/form-data',
        };
        const requestBody = {
            requestBody: {
                file: asyncAPIData
            },
        };
        promisedValidate = apiClient.then(client => {
            return client.apis.Validation.validateAsyncAPISpecification(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data'
                }),
            );
        });
        return promisedValidate;
    }

    static validateAsyncAPIByUrl(url, params = { returnContent: false }) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const payload = {
            'Content-Type': 'multipart/form-data',
            ...params
        };
        const requestBody = {
            requestBody: {
                url: url,
            },
        };
        return apiClient.then(client => {
            return client.apis['Validation'].validateAsyncAPISpecification(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
    }

    importAsyncAPIByFile(asyncAPIData, callback = null) {
        let payload, promisedCreate;
        promisedCreate = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                requestBody: {
                    file: asyncAPIData,
                    additionalProperties: JSON.stringify(apiData),
                }
            };

            const promisedResponse = client.apis['APIs'].importAsyncAPISpecification(
                null,
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promisedCreate;
    }

    importAsyncAPIByUrl(asyncAPIUrl) {
        let payload, promise_create;

        promise_create = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                requestBody: {
                    url: asyncAPIUrl,
                    additionalProperties: JSON.stringify(apiData),
                }
            };

            const promisedResponse = client.apis['APIs'].importAsyncAPISpecification(
                null,
                payload,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data'
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_create;
    }

    /**
     * Get the swagger of an API
     * @param id {String} UUID of the API in which the AsyncAPI definition is needed
     * @param callback {function} Function which needs to be called upon success of the API deletion
     * @returns {promise} With given callback attached to the success chain else API invoke promise
     */
    getAsyncAPIDefinition(id = this.id, callback = null) {
        const promise_get = this.client.then(client => {
            return client.apis['APIs'].get_apis__apiId__asyncapi(
                {
                    apiId: id,
                },
                this._requestMetaData(),
            );
        });
        return promise_get;
    }

    /**
     * Update an api via PUT HTTP method, Need to gie the updated API object as the arguement.
     * @param api {Object} Updated API object(JSON) which needs to be updated
     */
    updateAsyncAPIDefinition(asyncAPI) {
        const promised_update = this.client.then(client => {
            const payload = {
                apiId: this.id,
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    apiDefinition: JSON.stringify(asyncAPI)
                }
            };
            return client.apis['APIs'].put_apis__apiId__asyncapi(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
        return promised_update;
    }

    /**
     * Update AsyncAPI definition of a given API by URL content
     * @param apiId         API Identifier
     * @param AsyncAPIUrl    AsyncAPI definition content URL
     * @returns {boolean|*}
     */
    updateAsyncAPIDefinitionByUrl(apiId, AsyncAPIUrl) {
        let payload, promise_updated;

        promise_updated = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                apiId: apiId,
                'Content-Type': 'multipart/form-data',
            };

            const requestBody = {
                requestBody: {
                    url: AsyncAPIUrl,
                }
            };

            const promisedResponse = client.apis['APIs'].put_apis__apiId__asyncapi(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_updated;
    }

    /**
     * Update AsyncAPI definition of a given API by file content
     * @param apiId         API Identifier
     * @param AsyncAPIFile   AsyncAPI definition file content
     * @returns {boolean|*}
     */
    updateAsyncAPIDefinitionByFile(apiId, AsyncAPIFile) {
        console.log(apiId);
        console.log(AsyncAPIFile);
        let payload, promise_updated;

        promise_updated = this.client.then(client => {
            const apiData = this.getDataFromSpecFields(client);

            payload = {
                apiId: apiId,
                'Content-Type': 'multipart/form-data',
            };

            const requestBody = {
                requestBody: {
                    file: AsyncAPIFile,
                }
            };

            const promisedResponse = client.apis['APIs'].put_apis__apiId__asyncapi(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
            return promisedResponse.then(response => new API(response.body));
        });
        return promise_updated;
    }

    /**
     * Get all common operation policies
     * @param {String} limit limit of the common operation policy list which needs to be retrieved
     * @param {String} offset offset of the common operation policy list which needs to be retrieved
     * @returns {Promise} Promise containing common operation policies that can be used by any API
     */
    static getCommonOperationPolicies(limit = null, offset = null) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const policyLimit = limit ? limit : Configurations.app.operationPolicyCount;
        return restApiClient.then(client => {
            return client.apis['Operation Policies'].getAllCommonOperationPolicies(
                {
                    limit: policyLimit,
                    offset
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the details of a common operation policy by providing policy ID
     * @param {String} policyId UUID of the common operation policy to retrieve
     * @returns {Promise} Promise containing the requested common operation policy
     */
    static getCommonOperationPolicy(policyId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Operation Policies'].getCommonOperationPolicyByPolicyId(
                {
                    operationPolicyId: policyId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Add a common operation policy
     * @param {Object} policySpec policy specification of the common operation policy to upload
     * @param {any} synapsePolicyDefinition policy definition of the common operation policy for Synapse
     * @param {any} ccPolicyDefinition policy definition of the common operation policy for Choreo Connect
     * @returns {Promise} Promise containing uploaded operation policy specification
     */
    addCommonOperationPolicy(policySpec, synapsePolicyDefinition = null, ccPolicyDefinition = null) {
        const promised_addCommonOperationPolicy = this.client.then(client => {
            const payload = {
                'Content-Type': 'multipart/form-data',
            };
            const requestBody = {
                requestBody: {
                    policySpecFile: JSON.stringify(policySpec),
                    ...(synapsePolicyDefinition !== null ? {synapsePolicyDefinitionFile: synapsePolicyDefinition} : {}),
                    ...(ccPolicyDefinition !== null ? {ccPolicyDefinitionFile: ccPolicyDefinition} : {}),
                },
            }
            return client.apis['Operation Policies'].addCommonOperationPolicy(
                payload,
                requestBody,
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                })
            );
        });
        return promised_addCommonOperationPolicy;
    }

    /**
     * Delete a common operation policy
     * @param {String} policyId UUID of the common operation policy
     * @returns {Promise}
     */
    deleteCommonOperationPolicy(policyId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Operation Policies'].deleteCommonOperationPolicyByPolicyId(
                {
                    operationPolicyId: policyId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the content of a common operation policy
     * @param {String} policyId UUID of the common operation policy
     * @returns {Promise} Promise containing content of the requested common operation policy
     */
    static getCommonOperationPolicyContent(policyId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Operation Policies'].getCommonOperationPolicyContentByPolicyId(
                {
                    operationPolicyId: policyId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the content of an API specific operation policy
     * @param {String} policyId UUID of the operation policy
     * @param {String} apiId UUID of the API
     * @returns {Promise} Promise containing content of the requested operation policy
     */
    static getOperationPolicyContent(policyId, apiId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Operation Policies'].getAPISpecificOperationPolicyContentByPolicyId(
                {
                    operationPolicyId: policyId,
                    apiId: apiId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get API Operation Policies
     * @param {String} apiId UUID of the API
     * @returns {Promise} Promise with list of operation policies
     */
    static getOperationPolicies(apiId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const limit = Configurations.app.operationPolicyCount || 80;
        return restApiClient.then(client => {
            return client.apis['API Operation Policies'].getAllAPISpecificOperationPolicies(
                {
                    apiId: apiId,
                    limit: limit,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get policy details of an API specific policy
     * @param {String} policyId UUID of the operation policy to retrieve
     * @param {String} apiId UUID of the API
     * @returns {Promise} Promise containing the requested operation policy
     */
    static getOperationPolicy(policyId, apiId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Operation Policies'].getOperationPolicyForAPIByPolicyId(
                {
                    apiId: apiId,
                    operationPolicyId: policyId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Add an API specific operation policy
     * @param {Object} policySpec policy specification of the operation policy
     * @param {String} apiId UUID of the API
     * @param {any} synapsePolicyDefinition policy definition of the operation policy for Synapse
     * @param {any} ccPolicyDefinition policy definition of the operation policy for Choreo Connect
     * @returns {Promise} Promise containing added operation policy specification
     */
    static addOperationPolicy(policySpec, apiId, synapsePolicyDefinition = null, ccPolicyDefinition = null) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Operation Policies'].addAPISpecificOperationPolicy(
                {
                    apiId: apiId,
                },
                {
                    requestBody: {
                        policySpecFile: JSON.stringify(policySpec),
                        ...(synapsePolicyDefinition !== null ? {synapsePolicyDefinitionFile: synapsePolicyDefinition} : {}),
                        ...(ccPolicyDefinition !== null ? {ccPolicyDefinitionFile: ccPolicyDefinition} : {}),
                    },
                },
                this._requestMetaData({
                    'Content-Type': 'multipart/form-data',
                }),
            );
        });
    }

    /**
     * Delete an API specific operation policy by the API uuid and policy uuid
     * @param {String} apiId UUID of the API
     * @param {String} policyId UUID of the operation policy to delete
     * @returns {Promise}
     */
    static deleteOperationPolicy(apiId, policyId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Operation Policies'].deleteAPISpecificOperationPolicyByPolicyId(
                {
                    apiId: apiId,
                    operationPolicyId: policyId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get all global policies
     * @param {number} limit Limit of the global policy list which needs to be retrieved
     * @param {number} offset Offset of the global policy list which needs to be retrieved
     * @param {String} query Search attribute by using an "gatewayLabel:" modifier
     * @returns {Promise} Promise containing global policies list
     */
    static getAllGatewayPolicies(limit = null, offset = 0, query = null) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Gateway Policies'].getAllGatewayPolicies(
                { limit, offset, query },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Add a new global policy
     * @param {Object} body policy schema which holds the newly added data
     * @returns {Promise} Promise containing the added global policy
     */
    static addGatewayPoliciesToFlows(body) {
        const apiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const requestBody = {
            requestBody: body,
        };
        return apiClient.then(client => {
            return client.apis['Gateway Policies'].addGatewayPoliciesToFlows(
                {},
                requestBody,
                this._requestMetaData(),
            );
        });
    }

    /**
     * Delete a global policy
     * @param {String} gatewayPolicyMappingId UUID of the global policy to delete
     * @returns {Promise} Response
     */
    static deleteGatewayPolicyByPolicyId(gatewayPolicyMappingId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Gateway Policies'].deleteGatewayPolicyByPolicyId(
                {gatewayPolicyMappingId},
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the global policy by ID
     * @param {String} gatewayPolicyMappingId UUID of the global policy
     * @returns {Promise} Response containing the information of the requested global policy
     */
    static getGatewayPolicyMappingContentByPolicyMappingId(gatewayPolicyMappingId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['Gateway Policies'].getGatewayPolicyMappingContentByPolicyMappingId(
                {gatewayPolicyMappingId},
                this._requestMetaData(),
            );
        });
    }

    /**
     * Update the global policy by ID
     * @param {String} gatewayPolicyMappingId UUID of the global policy
     * @param {Object} body policy schema which holds the updated data
     * @returns {Promise} Response containing the information of the requested global policy
     */
    static updateGatewayPoliciesToFlows(gatewayPolicyMappingId, body) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const requestBody = {
            requestBody: body,
        };
        return restApiClient.then(client => {
            return client.apis['Gateway Policies'].updateGatewayPoliciesToFlows(
                {gatewayPolicyMappingId},
                requestBody,
                this._requestMetaData(),
            );
        });
    }

    /**
     * Deploy the global policy for an gateway environment
     * @param {String} gatewayPolicyMappingId UUID of the global policy
     * @param {Object} body policy schema which holds the deployed and undeployed gateyway environments
     * @returns {Promise} Response
     */
    static engageGlobalPolicy(gatewayPolicyMappingId, body) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        const requestBody = {
            requestBody: body,
        };
        return restApiClient.then(client => {
            return client.apis['Gateway Policies'].engageGlobalPolicy(
                {gatewayPolicyMappingId},
                requestBody,
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the all LLM providers
     * @returns {Promise} Promise containing the list of LLM providers
     */
    static getLLMProviders() {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['LLMProviders'].getLLMProviders();
        });
    }

    /**
     * Get the LLM provider by ID
     * @param {String} llmProviderId UUID of the LLM provider
     * @returns {Promise} Promise containing the information of the requested LLM provider
     */
    static getLLMProviderById(llmProviderId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['LLMProvider'].getLLMProvider(
                {llmProviderId},
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the LLM provider API definition by id
     *
     * @param {String} llmProviderId
     */
    static getLLMProviderAPIDefinition(llmProviderId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['LLMProvider'].getLLMProviderApiDefinition(
                { llmProviderId },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the LLM provider API Endpoint Configuration by llmProviderId
     * 
     * @param {String} llmProviderId
     */
    static getLLMProviderEndpointConfiguration(llmProviderId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['LLMProvider'].getLLMProviderEndpointConfiguration(
                { llmProviderId },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get the LLM provider model list
     * 
     * @param {String} llmProviderId LLM Provider ID
     * @returns {Promise} Promise containing the list of LLM provider models
     */
    static getLLMProviderModelList(llmProviderId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['LLMProvider'].getLLMProviderModels(
                { llmProviderId },
                this._requestMetaData(),
            )
        });
    }

    /**
     * Get all endpoints of the API
     * @param {String} apiId UUID of the API
     * @param {number} limit Limit of the endpoints list which needs to be retrieved
     * @param {number} offset Offset of the endpoints list which needs to be retrieved 
     * @returns {Promise} Promise containing the list of endpoints of the API
     */
    static getApiEndpoints(apiId, limit = null, offset = 0) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Endpoints'].getApiEndpoints(
                {
                    apiId: apiId,
                    limit,
                    offset,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Get an endpoint of the API
     * @param {String} apiId UUID of the API
     * @param {String} endpointId UUID of the endpoint
     * @returns {Promise} Promise containing the requested endpoint
     * */
    static getApiEndpoint(apiId, endpointId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Endpoints'].getApiEndpoint(
                {
                    apiId: apiId,
                    endpointId: endpointId,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Add an endpoint to the API
     * @param {String} apiId UUID of the API 
     * @param {Object} endpointBody Endpoint object to be added
     * @returns {Promise} Promise containing the added endpoint object
     */
    static addApiEndpoint(apiId, endpointBody) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Endpoints'].addApiEndpoint(
                {
                    apiId: apiId,
                },
                {
                    requestBody: endpointBody,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Update an endpoint of the API
     * @param {String} apiId UUID of the API
     * @param {String} endpointId UUID of the endpoint
     * @param {Object} endpointBody Updated endpoint object
     * @returns {Promise} Promise containing the updated endpoint
     */
    static updateApiEndpoint(apiId, endpointId, endpointBody) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Endpoints'].updateApiEndpoint(
                {
                    apiId: apiId,
                    endpointId: endpointId,
                },
                {
                    requestBody: endpointBody,
                },
                this._requestMetaData(),
            );
        });
    }

    /**
     * Delete an endpoint of the API
     * @param {String} apiId UUID of the API
     * @param {String} endpointId UUID of the endpoint
     * @returns {Promise} Promise containing the deleted endpoint
     */
    static deleteApiEndpoint(apiId, endpointId) {
        const restApiClient = new APIClientFactory().getAPIClient(Utils.getCurrentEnvironment(), Utils.CONST.API_CLIENT).client;
        return restApiClient.then(client => {
            return client.apis['API Endpoints'].deleteApiEndpoint(
                {
                    apiId: apiId,
                    endpointId: endpointId,
                },
                this._requestMetaData(),
            );
        });
    }

}

API.CONSTS = {
    API: 'API',
    APIProduct: 'APIPRODUCT',
};

Object.freeze(API.CONSTS);

export default API;
