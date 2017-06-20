import sinon from 'sinon';

import { createMock } from '../../mocks/core';
import { createMockedStore } from '../../utils/redux';

import { Throttle } from '../../../src/js/utils/throttle';
import * as coreService from '../../../src/js/services/core';
import * as integrationsService from '../../../src/js/services/integrations';
import * as utilsFaye from '../../../src/js/services/faye';

const sandbox = sinon.sandbox.create();

describe('Integrations service', () => {
    let coreMock;
    let mockedStore;
    let pendingAppUser;

    beforeEach(() => {
        // Disable throttling for unit tests
        sandbox.stub(Throttle.prototype, 'exec', (func) => func());

        pendingAppUser = {
            appuser: {
                _id: '1',
                clients: [],
                pendingClients: [{
                    displayName: '+0123456789',
                    id: 'abcdefg',
                    platform: 'twilio',
                    linkedAt: '2016-07-28',
                    active: true
                }]
            }
        };

        coreMock = createMock(sandbox);
        coreMock.appUsers.linkChannel.resolves({
            appUser: pendingAppUser
        });
        coreMock.appUsers.unlinkChannel.resolves();
        coreMock.appUsers.pingChannel.resolves();
        coreMock.appUsers.getMessages.resolves({
            conversation: {
            },
            messages: []
        });
        coreMock.appUsers.transferRequest.resolves({
            transferRequests: [{
                code: '1234'
            }]
        });

        sandbox.stub(coreService, 'core', () => {
            return coreMock;
        });

        sandbox.stub(utilsFaye, 'subscribeConversation').resolves();
        sandbox.stub(utilsFaye, 'subscribeConversationActivity').resolves();

        mockedStore = createMockedStore(sandbox, {
            user: {
                _id: '1',
                clients: [],
                pendingClients: []
            },
            integrations: {
                twilio: {}
            },
            faye: {
                conversationSubscription: false
            }
        });

    });

    afterEach(() => {
        sandbox.restore();
    });


    describe('linkSMSChannel', () => {
        it('should set the twilio integration to pending state', () => {
            return mockedStore.dispatch(integrationsService.linkSMSChannel('1', {
                type: 'twilio',
                phoneNumber: '+0123456789'
            })).then(() => {
                coreMock.appUsers.linkChannel.should.have.been.calledWith('1', {
                    type: 'twilio',
                    phoneNumber: '+0123456789'
                });
            });
        });

        it('should start faye if user returns with conversationStarted', () => {
            pendingAppUser.conversationStarted = true;

            return mockedStore.dispatch(integrationsService.linkSMSChannel('1', {
                type: 'twilio',
                phoneNumber: '+0123456789'
            })).then(() => {
                coreMock.appUsers.getMessages.should.have.been.calledOnce;
                utilsFaye.subscribeConversation.should.have.been.calledOnce;
            });
        });
    });

    describe('unlinkSMSChannel', () => {
        it('should set the sms integration state to unlinked', () => {
            return mockedStore.dispatch(integrationsService.unlinkSMSChannel('1', 'twilio')).then(() => {
                coreMock.appUsers.unlinkChannel.should.have.been.calledWith('1', 'twilio');
            });
        });
    });

    describe('pingSMSChannel', () => {
        it('should call the ping channel API', () => {
            return mockedStore.dispatch(integrationsService.pingSMSChannel('1', 'twilio')).then(() => {
                coreMock.appUsers.pingChannel.should.have.been.calledWith('1', 'twilio');
            });
        });
    });

    describe('fetchTransferRequestCode', () => {
        it('should call the transferrequest API', () => {
            const channel = 'messenger';
            return mockedStore.dispatch(integrationsService.fetchTransferRequestCode(channel)).then(() => {
                coreMock.appUsers.transferRequest.should.have.been.calledWith('1', {
                    type: channel
                });
            });
        });
    });
});
