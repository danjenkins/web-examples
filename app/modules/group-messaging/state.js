(function groupMessagingState (App, respoke, $) {
    'use strict';

    /**
     * The state module
     * @type {respoke.EventEmitter}
     */
    var state = respoke.EventEmitter({});

    /**
     * The respoke client
     * @type {respoke.Client}
     */
    state.client = null;

    /**
     * Convenience handle to the "Everyone" group
     * @type {respoke.Group}
     */
    state.everyoneGroup = null;

    /**
     * The current logged in user(name)
     * @type {String}
     */
    state.loggedInUser = '';

    /**
     * Creates a Buddy object
     * @abstract
     * @param {(respoke.Endpoint|respoke.Group)} entity
     * @param {Boolean} [isActive]
     * @constructor
     */
    function Buddy(entity, isActive) {
        var buddy = {
            username: entity.id,
            presence: entity.presence || 'available',
            isActive: !!isActive,
            dispose: App.NO_OP,
            sendMessage: App.NO_OP
        };

        return respoke.EventEmitter(buddy);
    }

    /**
     * Creates a UserBody object
     * @param {respoke.Connection} connection
     * @param {Boolean} [isActive]
     * @returns {Buddy}
     * @constructor
     */
    function UserBuddy(connection, isActive) {
        var endpoint = connection.getEndpoint();
        var inst = new Buddy(endpoint, isActive);
        inst.dispose = function () {
            endpoint.ignore('presence', onPresenceChange);
            endpoint = null;
        };

        function onPresenceChange(e) {
            inst.presence = e.presence;
            inst.fire('presence.changed');
        }
        endpoint.listen('presence', onPresenceChange);

        inst.sendMessage = function (content) {
            return endpoint.sendMessage({
                message: content
            });
        };

        return inst;
    }

    /**
     * Creates a GroupBuddy object
     * @param {respoke.Group} group
     * @param {Boolean} [isActive]
     * @returns {Buddy}
     * @constructor
     */
    function GroupBuddy(group, isActive) {
        var inst = new Buddy(group, isActive);

        inst.sendMessage = function (content) {
            return group.sendMessage({
                message: content
            });
        };

        return inst;
    }

    /**
     * The user's current buddies/groups
     * @type {Array.<Buddy>}
     */
    state.buddies = [];

    /**
     * Finds a buddy by predicate (or ID)
     * @param {Function|String} predicate - function predicate or string ID
     * @returns {Array.<Buddy>}
     */
    function findBuddy(predicate) {
        var username = predicate;
        if (!$.isFunction (predicate)) {
            predicate = function (buddy) {
                return buddy.username === username;
            };
        }
        return state.buddies.filter(predicate)[0];
    }

    /**
     * Adds a buddy to the buddies collection
     * @param {(UserBuddy|GroupBuddy)} buddy
     */
    function addBuddy(buddy) {
        state.buddies.push(buddy);
        buddy.listen('presence.changed', function () {
            state.fire('buddies.updated');
        });
        if (buddy.isActive) {
            activateBuddy(buddy.username);
        }
    }

    /**
     * Removes a buddy from the buddies collection
     * @param {String} username
     * @returns {Buddy}
     */
    function removeBuddy(username) {
        var buddy = findBuddy(username);
        if (!buddy) {
            return;
        }
        buddy.ignore('presence.changed');
        buddy.dispose();
        state.buddies.splice(state.buddies.indexOf(buddy), 1);
        return buddy;
    }

    /**
     * Activates a buddy in the buddies collection
     * @param {String} username
     */
    var activateBuddy = state.activateBuddy = function activateBuddy(username) {
        var activeBuddy = null;
        state.buddies.forEach(function (buddy) {
            buddy.isActive = (buddy.username === username);
            if (buddy.isActive) {
                activeBuddy = buddy;
            }
        });
        if (!activeBuddy) {
            return;
        }
        state.fire('buddy.activated', {
            username: activeBuddy.username
        });
        openTab(username, true);
    };

    /**
     * @typedef {{connection: {endpointId:String, presence:String} }} GroupEvent
     */

    /**
     * Handles the group join event from respoke.Client
     * @param {GroupEvent} e - event
     */
    function onGroupJoin(e) {
        var username = e.connection.endpointId;

        // don't join self
        if (username === state.loggedInUser) {
            return;
        }

        var buddy = findBuddy(username);

        if (buddy) {
            // already tracking this endpoint
            return;
        }

        buddy = new UserBuddy(e.connection, false);
        addBuddy(buddy);

        state.fire('buddies.updated');
    }

    /**
     * Handles the group leave event from respoke.Client
     * @param {GroupEvent} e - event
     */
    function onGroupLeave(e) {
        var username = e.connection.endpointId;
        if (removeBuddy(username)) {
            state.fire('buddies.updated');
            closeTab(username);
        }
    }

    /**
     * @typedef {{label:String, isActive:Boolean}} Tab
     */

    /**
     * Data for open chat tabs
     * @type {Array.<Tab>}
     */
    state.tabs = [];

    /**
     * Retrieves the one and only active tab (if any)
     * @returns {Tab}
     */
    function activeTab() {
        return findTab(function (tab) {
            return tab.isActive;
        });
    }

    /**
     * Finds a specific tab by predicate or label
     * @param {Function|String} predicate - predicate function or label
     * @returns {Tab}
     */
    function findTab(predicate) {
        var label = predicate;
        if (!$.isFunction (predicate)) {
            predicate = function (tab) {
                return tab.label === label;
            };
        }
        return state.tabs.filter(predicate)[0];
    }

    /**
     * Opens a specific tab
     * @param {String} label
     * @param {Boolean} [isActive] - make this the active tab
     * @returns {Tab}
     */
    function openTab(label, isActive) {
        var tab = findTab(label);
        if (!tab) {
            tab = {
                label: label,
                isActive: !!isActive
            };
            state.tabs.push(tab);
        }
        if (isActive) {
            activateTab(label);
        }
        state.fire('tab.opened', {
            label: label,
            isActive: isActive
        });
        return tab;
    }

    /**
     * Closes a specific tab
     * @param {String} label
     */
    var closeTab = state.closeTab = function closeTab(label) {
        var tab = findTab(label);
        if (!tab) {
            return;
        }
        if (tab.isActive) {
            deactivateTab(label);
        }
        state.tabs.splice(state.tabs.indexOf(tab), 1);
        state.fire('tab.closed', {
            label: label
        });
    };

    /**
     * Activate a specific tab (or optionally deactivate all tabs if label is omitted)
     * @param {String} [label] - tab label
     */
    var activateTab = state.activateTab = function activateTab(label) {
        state.tabs.forEach(function (tab) {
            tab.isActive = (tab.label === label);
        });
        if (hasActiveTab()) {
            state.fire('tab.activated', {
                label: label
            });
        }
        state.fire('tabs.updated');
    };

    /**
     * Deactivates a tab
     * @param {String} label
     */
    function deactivateTab(label) {
        var tab = findTab(label);
        if (!tab) {
            return;
        }
        tab.isActive = false;
        state.fire('tab.deactivated', {
            label: label
        });
    }

    /**
     * Convenience method to determine if there is an active tab
     * @returns {Boolean}
     */
    var hasActiveTab = state.hasActiveTab = function hasActiveTab() {
        return !!activeTab();
    };

    /**
     * @typedef {{to:String, from:String, content:String, timestamp:Number, isMyMessage:Boolean}} ChatMessage
     */

    /**
     * Chat message data
     * @type {Array.<ChatMessage>}
     */
    state.messages = {};

    /**
     * User message
     * @param {String} to
     * @param {String} from
     * @param {String} content
     * @param {Number} timestamp
     * @constructor
     */
    function UserMessage(to, from, content, timestamp) {
        this.to = to;
        this.from = from;
        this.content = content;
        this.timestamp = timestamp;
        this.isMyMessage = (from === state.loggedInUser);
        this.key = function () {
            return this.isMyMessage ? this.to : this.from;
        };
    }

    /**
     * Group message
     * @param {String} to
     * @param {String} from
     * @param {String} content
     * @param {Number} timestamp
     * @param {String} recipient
     * @constructor
     */
    function GroupMessage(to, from, content, timestamp, recipient) {
        UserMessage.call(this, to, from, content, timestamp);
        this.recipient = recipient;
        this.key = function () {
            return this.recipient;
        };
    }

    GroupMessage.prototype = UserMessage.prototype;

    /**
     * Sort function for objects with timestamps
     * @param {{timestamp:Number}} a
     * @param {{timestamp:Number}} b
     * @returns {Number}
     */
    function timestampSort(a, b) {
        if (a.timestamp === b.timestamp) {
            return 0;
        }
        return a.timestamp > b.timestamp ? 1 : -1;
    }

    /**
     * Adds a message to the message hash
     * @param {(UserMessage|GroupMessage)} message
     */
    function addMessage(message) {
        var key = message.key();

        if (!state.messages.hasOwnProperty(key)) {
            state.messages[key] = [];
        }

        state.messages[key] =
            state.messages[key].concat([message])
                .sort(timestampSort);

        if (hasActiveTab() && key === activeTab().label) {
            state.fire('message.added', {
                to: message.to,
                from: message.from
            });
        }

        state.fire('messages.updated');

        // if there is no active tab, open one for this
        // message's sender
        if (!hasActiveTab()) {
            openTab(key, true);
        }

        // if this message's sender has no tab at all
        // and an active tab is already open, open a new
        // tab but make it inactive
        var tab = findTab(key);
        if (!tab) {
            openTab(key, false);
        }
    }

    /**
     * Gets the "active messages" (e.g., messages for the open tab)
     * @returns {Array.<ChatMessage>}
     */
    state.activeMessages = function activeMessages() {
        if (!hasActiveTab()) {
            return [];
        }
        return state.messages[activeTab().label] || [];
    };

    /**
     * @typedef {{endpointId:String, message:String, timestamp:Number}} MessageEvent
     */

    /**
     * Handles the message event from respoke.Client
     * @param {MessageEvent} e - event
     */
    function onMessageReceived(e) {
        var message = e.message;
        var MessageCtor = !!message.recipient ?
            GroupMessage :
            UserMessage;
        var newMessage = new MessageCtor(
            state.loggedInUser,
            message.endpointId,
            message.message,
            message.timestamp,
            message.recipient
        );
        addMessage(newMessage);
        state.fire('message.received', {
            key: newMessage.key()
        });
    }

    /**
     * Sends a chat message
     * @param {String} message
     * @returns {respoke.Promise}
     */
    state.sendMessage = function sendMessage(message) {
        var to = activeTab().label,
            content = message,
            timestamp = Date.now();

        var buddy = findBuddy(to);
        if (!buddy) {
            return;
        }

        return buddy.sendMessage(content).then(function () {
            state.fire('message.sent');
            var message = new UserMessage(
                buddy.username,
                state.loggedInUser,
                content,
                timestamp
            );
            addMessage(message);
        }, function (err) {
            state.fire('message.failed');
            console.error(err);
        });
    };

    // initialization/load methods

    /**
     * Loads all buddies
     * @returns {respoke.Promise}
     */
    state.loadBuddies = function () {
        return state.client.join({id: 'Everyone'}).then(function (group) {
            state.fire('group.joined');
            var buddy = new GroupBuddy(group, false);
            addBuddy(buddy);
            state.everyoneGroup = group;
            state.everyoneGroup.listen('join', onGroupJoin);
            state.everyoneGroup.listen('leave', onGroupLeave);
            return state.everyoneGroup.getMembers().then(function (connections) {
                connections.filter(function (connection) {
                    // ignore self
                    return connection.endpointId !== state.loggedInUser;
                }).forEach(function (connection) {
                    var buddy = new UserBuddy(connection, false);
                    addBuddy(buddy);
                });
            }).then(function () {
                state.fire('buddies.updated');
            }, function (err) {
                state.fire('buddies.error', err);
                console.error(err);
            });
        }, function (err) {
            state.fire('group.unjoined', err);
            console.error(err);
        });
    };

    /**
     * Logs the user in
     * @param {String} username
     * @returns {respoke.Promise}
     */
    state.login = function (username) {
        return state.client.connect({
            endpointId: username,
            presence: 'available'
        }).done(function () {
            state.loggedInUser = username;
            state.client.listen('message', onMessageReceived);
            state.fire('login.success');
        }, function (err) {
            state.fire('login.error', err);
            console.error(err);
        });
    };

    /**
     * Logs the user out
     */
    state.logout = function () {
        return state.client.disconnect().then(function () {
            state.client.ignore('message', onMessageReceived);
            state.buddies.forEach(function (buddy) {
                buddy.dispose();
            });
            state.buddies = [];
            state.fire('buddies.updated');
            state.tabs = [];
            state.fire('tabs.updated');
            state.messages = {};
            state.fire('messages.updated');
            state.everyoneGroup.ignore('join', onGroupJoin);
            state.everyoneGroup.ignore('leave', onGroupLeave);
            state.everyoneGroup = null;
            state.loggedInUser = '';
            state.fire('logout.success');
        }, function (err) {
            state.fire('logout.failed', err);
            console.error(err);
        });
    };

    /**
     * Initializes application state and creates a client
     * connection to respoke
     */
    state.init = function (appId) {
        if (state.client && state.client.isConnected()) {
            return;
        }
        var connectionOptions = {
            appId: appId,
            developmentMode: true
        };
        state.client = respoke.createClient(connectionOptions);
        state.fire('init.success');
    };

    /**
     * App.state module
     * @type {respoke.EventEmitter}
     */
    App.state = state;

}(App, respoke, jQuery));