var board;
var logHeightTimeOut = 0;
var playLog;
// (function ($) {
'use strict';
class PlayLog {
    constructor(options) {
        var _default = {
            'Board': {},
            'elm': $('.log-message-container'),
            'name': 'PlayLog',
            'options': {},
            'initItems': {},
        };
        $.extend(this, _default, options);
        this.init();
    }
    init() {
        this.steps = [];
        this.pointer = 0;
        this.isStarted = false;
        this.isRePlaying = false;
        this.isPausing = false;
        this.replaytimeout = 0;
        this.messageElm = this.elm.find('#log-message');
        this.overlay = $('<div class="replay-overlay"></div>').css({
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            zIndex: 99,
            display: 'none',
        });
        var boardElm = this.getBoard().getBoardElm();
        boardElm.find('.replay-overlay').remove();
        boardElm.append(this.overlay);
        this.messageElm.empty();
        this.events();

    }
    events() {
        playLog = this;
        $('.start-record-button').removeClass('hidden');

        $('.replay-button').off('click').on('click', function () {

            // Switch button
            // $('.replay-button').addClass('hidden');
            // $('.start-record-button').addClass('hidden');
            // $('.stop-record-button').addClass('hidden');

            playLog.replay();
            // $('.start-record-button').removeClass('hidden');
        });

        $('.start-record-button').off('click').on('click', function () {
            var data = playLog.getBoard().getItems();
            playLog.addStep('startRecord', undefined, { ...data }, {});

            // Switch button
            $('.replay-button').addClass('hidden');
            $('.start-record-button').addClass('hidden');
            $('.stop-record-button').removeClass('hidden');


        });

        $('.stop-record-button').off('click').on('click', function () {
            var data = playLog.getBoard().getItems();
            playLog.addStep('stopRecord', undefined, { ...data }, {});

            // Switch button
            $('.replay-button').removeClass('hidden');
            $('.start-record-button').removeClass('hidden');
            $('.stop-record-button').addClass('hidden');

            // Combo graph: auto-generate from the just-recorded combo.
            if (typeof window.comboGraphRefresh === 'function') window.comboGraphRefresh();

        });

        $('.pause-button').off('click').on('click', function () {
            playLog.pauseReplay();
        });

        $('.resume-button').off('click').on('click', function () {
            playLog.resumeReplay();
        });
        playLog.chatEvents();
    }
    chatEvents() {
        var playLog = this;

        playLog.elm.on('click', '.chat-btn', function (e) {
            var chatInput = playLog.elm.find('.chat-input');
            var chatMessage = chatInput.val();
            chatInput.val('');
            // escape message by html tag
            chatMessage = $('<div/>').text(chatMessage).html();


            chatMessage && playLog.addStep('chat', undefined, `${chatMessage}`, undefined);
        });

        // Event when press enter
        playLog.elm.on('keyup', '.chat-input', function (e) {
            if (e.which === 13) {
                var chatInput = playLog.elm.find('.chat-input');
                var chatMessage = chatInput.val();
                chatInput.val('');
                // escape message by html tag
                chatMessage = $('<div/>').text(chatMessage).html();


                chatMessage && playLog.addStep('chat', undefined, `${chatMessage}`, undefined);
            }
        });
    }
    async setInitItems(items) {
        this.initItems = items;
    }
    async addStep(action, uuid, data, oldData) {
        // if(( !this.isStarted) && (action != 'startRecord') ) return false;
        // console.log( action, uuid, data, oldData );
        if (this.isRePlaying) return false;
        var message = '';
        var board = this.Board;
        var card = board.getItemById(uuid);


        switch (action) {
            case 'init': // Sự kiện này đã bị bỏ, sẽ remove ở version sau
                console.warn(' This function is deprecated');
                message += oldData;
                uuid = undefined;
                oldData = undefined;
                break;

            case 'startRecord':
                message += `<p>Init state</p>`;
                this.messageElm.empty();
                uuid = undefined;
                oldData = undefined;
                this.isStarted = true;
                this.steps = [];
                var initData = board.copyCardData(data);
                data = {
                    items: initData,
                    currentPhase: board.currentPhase,
                    skill: board.skill,
                };
                break;

            case 'stopRecord':
                if (!this.isStarted) {
                    this.writeStep(`<p class="highlight-log">Not Start yet!</p>`);
                    return false;
                }
                message += `<p> Stop Record</p>`;
                uuid = undefined;
                oldData = undefined;
                this.isStarted = false;
                break;

            case 'update':
                $.each(data, function (key, value) {
                    switch (key) {
                        case 'position':
                            var collection = board.getCollectionByPosition(value);
                            let posName = value;
                            if (collection) {
                                posName = collection.getName();
                            };
                            message += `<p class="log-step" data-possition="${StateGuards.escapeHtml(value)}"> <span class="card-key">Move</span> card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span> to <span class="new-state">${StateGuards.escapeHtml(posName)}</span> </p>`;

                            break;
                        case 'foldState':
                            message += `<p class="log-step" data-foldState="${value}"> <span class="card-key">Flip</span> card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span> to <span class="new-state">${value}</span> </p>`;

                            break;
                        case 'switchState':
                            message += `<p class="log-step" data-foldState="${value}"> <span class="card-key">Switch</span> card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span> to <span class="new-state">${value}</span> </p>`;

                            break;
                        default:
                            message += `<p class="log-step ddescription" data-newValue="${StateGuards.escapeHtml(value)}"> Change <span class="card-key">${StateGuards.escapeHtml(key)}</span> <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span> to <span class="new-state">${StateGuards.escapeHtml(value)}</span> </p>`;
                            break;
                    }
                });
                break;

            case 'overlay':
                message += `<p class="log-step"> Overlay card <span class="log-card-name" data-id="${card.uuid}" data-order="${StateGuards.escapeHtml(data.order)}">${StateGuards.escapeHtml(card.name)}</span></p>`;
                break;

            case 'detach':
                message += `<p class="log-step"> Detach card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span></p>`;
                break;


            case 'target':
                message += `<p class="log-step"> Target card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span></p>`;
                break;

            case 'declare':
                message += `<p class="log-step"> Declared effect of <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span></p>`;
                break;

            case 'reveal':
                message += `<p class="log-step"> Reveal card <span class="log-card-name" data-id="${card.uuid}">${StateGuards.escapeHtml(card.name)}</span></p>`;
                break;

            case 'shuffle':
                message += `<p class="log-step" data-shuffle="yes"> <span class="new-state"> Shuffle Cards</span> </p>`;
                uuid = undefined;
                oldData = undefined;

            case 'shuffle_deck':
                message += `<p class="log-step" data-shuffle="yes"> <span class="new-state"> Shuffle Deck</span> </p>`;
                uuid = undefined;
                oldData = undefined;
                break;

            case 'update-phase':
                var phase = data;
                message += `<p class="log-step"> <span class="new-state"> Enter ${board.phases[phase]}</span> </p>`;
                uuid = undefined;
                break;

            case 'active-skill':
                var skill = board.getActiveSkill();
                message += `<p class="log-step"> <span class="new-state"> Activate ${StateGuards.escapeHtml(skill)}</span> </p>`;
                uuid = undefined;
                break;
                break;

            case 'chat':
                var player_name = board.get('player');
                message += `<p class="log-step"> <span class="card-key"> ${player_name}: </span> <span class="new-state"> ${data}</span> </p>`;
                uuid = undefined;
                break;
        }


        // if (action == 'startRecord') {
        //     this.steps.push({
        //         action: 'update-phase',
        //         uuid: undefined,
        //         data: board.currentPhase,
        //         message: `<p class="log-step"> <span class="new-state"> Enter ${board.phases[board.currentPhase]}</span> </p>`;,
        //     });
        // }

        if ((this.isStarted) || (action == 'startRecord')) {
            this.steps.push({
                action: action,
                uuid: uuid,
                data: typeof data == 'object' ? { ...data } : data,
                oldData: oldData || {},
                message: message || '',
            });
        }

        this.messageElm.append(message);
        this.messageElm.stop().animate({ scrollTop: 999999 }, 300);
        return true;
    }
    // get next step
    step() {
        var boardElm = this.getBoard().getBoardElm();
        if (!$('body').find(boardElm).length) return false;
        let isLast = this.isLastStep();
        let step = this.steps[this.pointer++] || 0;
        if (!step) return false;
        step['isLastStep'] = isLast;
        step['nextStep'] = isLast ? 0 : this.steps[this.pointer + 1];
        return step;
    }
    hasRecord() {
        return this.steps.length;
    }
    isFirstStep() {
        return this.pointer == 0;
    }
    isLastStep() {
        return this.pointer == this.steps.length - 1;
    }
    // replay
    replay() {
        playLog = this;
        var board = this.getBoard();
        board.beforeReplay();
        if (!this.hasRecord()) {
            this.writeStep(`<p class="highlight-log">No Records found</p>`);
            this.stopReplay();
            return false;
        }

        $('.start-record-button').addClass('hidden');
        $('.stop-record-button').addClass('hidden');
        $('.replay-button').addClass('hidden');

        $('.pause-button').removeClass('hidden');
        $('.resume-button').removeClass('hidden');

        this.pointer = 0;
        this.isRePlaying = true;
        this.addOverlay();
        // Combo graph: rebuild + reset highlight so it tracks this playback.
        if (typeof window.comboGraphOnReplayStart === 'function') window.comboGraphOnReplayStart();
        // const waitTime = this.options.waitTime || 500;
        this.playStep();
    }
    addOverlay() {
        // this.overlay.fadeIn('300');
    }
    playStep() {
        // console.warn('Play step', this.pointer);
        if (this.isPausing) {
            this.writePause();
            return false;
        }
        var step = this.step();
        var log = this;
        if (!step) {
            this.writeEnd();
            this.stopReplay();
            return false;
        }
        // Combo graph: highlight the node for the step now playing (pointer was post-incremented).
        if (typeof window.comboGraphOnStep === 'function') window.comboGraphOnStep(this.pointer - 1);
        var waitTime = this.options.waitTime || 1500;
        var action = step.action || 'update';
        var data = step.data;
        var oldData = step.oldData;
        var board = this.Board;
        var card = board.getCard(step.uuid);
        switch (action) {
            case 'update':
                // var card = board.getItemById( step.uuid );
                var isMoving = ('position' in data) && ('position' in oldData) && (data.position != oldData.position);
                var inCollectionMoving = ('collection_order' in data) && ('collection_order' in oldData) && (data.collection_order != oldData.collection_order);
                isMoving = isMoving || inCollectionMoving;
                var isFlipping = ('foldState' in data) && ('foldState' in oldData) && (data.foldState != oldData.foldState);
                var isRorating = ('switchState' in data) && ('switchState' in oldData) && (data.switchState != oldData.switchState);
                if (isFlipping || isRorating) {
                    // No waiting time
                    waitTime = 5;
                }
                var overlapCards = [];
                var isOverlay = false;
                var isMoveWithAllOverlap = false;
                var isDetachAllOverlap = false;
                if (isMoving) {
                    isOverlay = card.isOverlay || false;;
                    isMoveWithAllOverlap = isOverlay && data.position == 'summon';
                    isDetachAllOverlap = isOverlay && data.position != 'summon';
                    var moveContainer = card.startMoveAnimation(isMoveWithAllOverlap);
                    card.startBoardAnimation(moveContainer, isMoveWithAllOverlap);
                    if (isOverlay) {
                        overlapCards = board.getItemsByCollectionOrder(card.collection_order).filter(item => {
                            return item.uuid != card.uuid;
                        });
                    }
                }
                $.each(data, function (key, value) {
                    log.writeStep(step.message || `Update ${key} to ${value}`);
                    board.updateItem(step.uuid, key, value);
                    if (isMoveWithAllOverlap && (key == 'collection_order')) {
                        overlapCards.forEach(card => {
                            card.collection_order = value;
                        });
                    }
                });
                if (isMoving) {
                    setTimeout(function () {
                        card.moveAnimation(moveContainer);
                        setTimeout(function () {
                            card.appendToBoard(); // End animation of the card
                            isMoveWithAllOverlap && overlapCards.forEach(card => {
                                card.appendToBoard();
                            });
                            overlapCards.length && board.checkOverlaySlot(card.collection_order);
                            card.endBoardAnimation(moveContainer);
                            if (oldData.position || data.position) {
                                [oldData.position, data.position].forEach(position => {
                                    if (!position) return;
                                    var collection = board.getCollectionByPosition(position);
                                    collection && collection.drawOnBoard();
                                });
                            }

                        }, 400);
                        isDetachAllOverlap && overlapCards.forEach(function (overlapCard) {
                            overlapCard.detachOverlap(false);
                        });
                    }, 5);
                }

                break;
            case 'shuffle':
                log.writeStep(step.message || ` Shuffle Cards`);
                // Update from data to cards
                $.each(data, function (index, item) {
                    // var card = board.getItemById( item.uuid );
                    $.each(['collection_order', 'order'], function (i, k) {
                        board.updateItem(item.uuid, k, item[k]);
                    });
                });
            case 'shuffle_deck':
                var position = 'deck';
                log.writeStep(step.message || ` Shuffle Deck`);
                // Update from data to cards
                $.each(data, function (index, item) {
                    // var card = board.getItemById( item.uuid );
                    $.each(['collection_order', 'order'], function (i, k) {
                        board.updateItem(item.uuid, k, item[k]);
                    });
                });
                var deck = board.getCollectionByPosition(position);
                deck.reDraw();
                break;
            case 'target':
            case 'declare':
            case 'reveal':
                card[action]();
                log.writeStep(step.message || `Update ${key} to ${value}`);
                break;
            case 'init': // Function này đã bị bỏ, sẽ remove ở version sau
                console.warn(' This function is deprecated');
                // var initData = {...data};
                var initData = board.copyCardData(data);
                this.messageElm.empty();
                board.emptyBoard();
                board.setItems(initData);
                log.writeStep(`<p class="highlight-log">START REPLAY</p>`);
                log.writeStep(step.message || `Initialized board`);

                break;

            case 'overlay':
                log.writeStep(step.message || ``);
                board.overlayCard(card.uuid, data.order);
                break;

            case 'detach':
                log.writeStep(step.message || ``);
                card.detachOverlap();
                // waitTime = 5;
                break;

            case 'startRecord':
                var initData = { ...data.items };
                var phase = data.currentPhase;
                var skill = data.skill;
                this.messageElm.empty();
                board.emptyBoard();
                sleep(2000, 'wait 2s');
                initData && board.setItems(initData);
                board.setPhase(phase);
                board.setSkill(skill);
                log.writeStep(`<p class="highlight-log">START REPLAY</p>`);
                log.writeStep(step.message || `Initialized board`);
                // debugger;
                break;

            case 'stopRecord':
                log.writeStep(step.message || ``);
                break;

            case 'update-phase':
                var phase = data;
                log.writeStep(step.message || ``);
                board.setPhase(phase);
                break;

            case 'active-skill':
                log.writeStep(step.message || ``);
                board.activateSkill();
                break;

            case 'chat':
                log.writeStep(step.message || ``);
                break;
        }

        this.replaytimeout = setTimeout(function () {
            log.playStep();
        }, waitTime);


        // if( this.isLastStep() ){
        //     this.writeEnd();
        // }
    }

    // write step
    writeStep(message) {
        this.messageElm.append(`<p>${message}</p>`);
        // console.warn( message );
        this.messageElm.stop().animate({ scrollTop: 99999 }, 300);

    }
    writePause() {
        this.writeStep(`<p class="highlight-log">PAUSE!!</p>`);
    }

    writeResume() {
        this.writeStep(`<p class="highlight-log">RESUME!!</p>`);
    }
    writeEnd() {
        this.writeStep(`<p class="highlight-log">COMPLETE REPLAY!!</p>`);

    }
    // stop replay
    stopReplay() {
        playLog = this;
        this.pointer = 0;
        this.isRePlaying = false;
        this.isPausing = false;
        clearTimeout(this.replaytimeout);
        this.removeOverlay();


        $('.start-record-button').removeClass('hidden');
        //$('.stop-record-button').removeClass('hidden');
        $('.replay-button').removeClass('hidden');

        $('.pause-button').addClass('hidden');
        $('.resume-button').addClass('hidden');
        var board = this.getBoard();
        board.afterReplay();
        // Combo graph: clear replay highlight.
        if (typeof window.comboGraphOnReplayEnd === 'function') window.comboGraphOnReplayEnd();
    }
    pauseReplay() {
        if (this.isRePlaying) {
            this.isPausing = true;
            return true;
        }
        return false;
    }
    resumeReplay() {
        if (this.isRePlaying && this.isPausing) {
            this.isPausing = false;
            this.writeResume();
            this.playStep();
            return true;
        }
        return false;
    }
    removeOverlay() {
        // this.overlay.fadeOut('300');
    }
    // reset
    reset() {
        this.pointer = 0;
        this.isRePlaying = false;
        this.isPausing = false;
        this.messageElm.empty();
    }

    getBoard() {
        return this.Board;
    }
}
class Card {
    constructor(Board, item, order, options) {
        // this.item = item;
        var _default = {
            cardId: 0,
            uuid: 0,
            name: 'card',
            order: 1,
            collection_order: 1,
            canMoveHand: true,
            canMoveSummon: true,
            canMoveExDeck: true,
            canMoveDeck: true,
            canMoveST: true,
            canMoveBanish: true,
            canMoveGraveyard: true,
            foldState: 'normal',
            switchState: 'attack',
            position: 'deck',
            isExtra: 0,
        };
        $.extend(this, _default, item);
        if (this.uuid == 0) { this.uuid = ygoUUID(); }
        // this.isExtra && ( this.canMoveDeck = 0);
        // this.canMoveExDeck = this.isExtra;
        this.options = options;
        this.order = order;
        this.Board = Board;
        this.itemBefore = {};
        this.init();
    }
    init() {
        this.drawHtml(this.options);
    }
    // validate
    canMoveTo(newPosition) {
        var _board = this.getBoard();
        newPosition = newPosition || 'hand'; // hand / deck / exdeck / graveyard / summon / st / banish / fz
        //1
        var allow = false;
        switch (newPosition) {
            case 'hand':
            case 'deck':
            case 'graveyard':
            case 'banish':
                allow = true;
                break;
            case 'summon':
                allow = true;
                var summonElm = _board.getFreeSummon();
                if (!summonElm.length) {
                    allow = false;
                }
                break;
            case 'st':
                allow = true;
                var stElm = _board.getFreeST();
                if (!stElm.length) {
                    allow = false;
                }
                break;
            case 'exdeck':
                if (this.canMoveExDeck) {
                    allow = true;
                }
                break;
            case 'fz':
                allow = this.isSpell;
                var fzElm = _board.getFreeFZ();
                if (!fzElm.length) {
                    allow = false;
                }
                break;
            default:
                allow = false;

        }

        return allow;
    }
    canFlip(newState) {
        newState = newState || 'normal'; // normal / fold 

        //1 
        return this.foldState != newState;
    }

    canSwitch(newState) {
        newState = newState || 'attack'; // attack / defense


        return this.switchState != newState;
    }

    getNewOffset() {
        return [0, 0];
    }

    // Switch state
    beforeMove(newPosition) {
        this.itemBefore = { ...this };
        return true;
    }
    afterMove(newPosition) {
        this.getBoard().writelog('update', this.uuid, {
            position: this.position,
            collection_order: this.collection_order,
        }, {
            position: this.itemBefore.position,
            collection_order: this.itemBefore.collection_order,
        });

        // Draw old collection was moved from
        if (this.position != this.itemBefore.position) {
            var collection = this.getBoard().getCollectionByPosition(this.itemBefore.position);
            collection && collection.drawOnBoard();
        }
        return true;
    }

    // Biến order chỉ dùng cho summon và ST / FZ
    moveTo(newPosition, isTop, order, fireEvent = true) {
        if (!['hand', 'deck', 'exdeck', 'graveyard', 'summon', 'st', 'banish', 'fz'].includes(newPosition)) return false;

        var _card = this;
        var _board = _card.getBoard();
        var result = false;
        if (typeof isTop == 'undefined') isTop = true;
        var oldPosition = _card.position;
        var isOverlay = _card.isOverlay || false;;
        var isMoveAllOverlap = isOverlay && newPosition == 'summon';

        if (!_card.beforeMove(newPosition)) return false;

        var overlapCards = isMoveAllOverlap ?
            overlapCards = board.getItemsByCollectionOrder(_card.collection_order) :
            [];

        // Nếu oldPosition là hand thì lưu thẻ cha để remove
        var willRemove = [];
        if (oldPosition == 'hand') {
            willRemove = _card.html.parent();
        }
        if (_card.canMoveTo(newPosition)) {
            // 1
            result = true;

            var moveContainer = _card.startMoveAnimation(isMoveAllOverlap);
            _card.startBoardAnimation(moveContainer, isMoveAllOverlap);

            var newOrder = 0;
            var newCollection = _card.getBoard().getCollectionByPosition(newPosition);
            var items = [];
            if (newCollection) {
                if (isTop) {
                    if (newCollection) {
                        let last = newCollection.getTopCard();
                        newOrder = last ? last.collection_order + 2 : 1;
                        _card.collection_order = newOrder;
                    }
                } else {
                    _card.collection_order = newOrder;
                }
            } else {
                _card.collection_order = newOrder;
                // overlapCards.forEach(card => {
                //     card.collection_order = newOrder; moveAnimation
                // });
            }
            if (['summon', 'st', 'fz'].includes(newPosition)) {
                order = order || 1;
                var _continue = 1;
                var _slot = _board.elm.find('.card-slot[data-order="' + order + '"]');
                if (!_slot.find('.simulator-card').length) {
                    _continue = 0;
                    _card.collection_order = order;
                    overlapCards.forEach(card => {
                        card.collection_order = order;
                    });
                    board.checkOverlaySlot(order);
                } else {
                    console.warn('No Space to move card');
                    _card.endBoardAnimation(moveContainer);
                    return false;
                }
            }
            // Lật thẻ sẽ làm thay đổi order, cần cập nhật lại set new position here
            _card.position = newPosition;
            if (_card.itemBefore.position == 'banish') {
                _card.fold('normal');
            }

            // reorder newCollection
            if (newCollection) {
                items = newCollection ? newCollection.getCollectionItems() : [];
            }


            if (newPosition != 'summon') {
                _card.switchState = 'attack';
                _card.updateHtml();
            }
            // if( newPosition != 'hand' ){
            // _card.foldState = 'normal';
            // _card.updateHtml();
            // }
            if (!_card.appendToBoard()) {
                console.warn('Not moved');
                _card.endBoardAnimation(moveContainer);
                return false;
            } else {
                overlapCards.forEach(card => {
                    card.appendToBoard();
                });
            }

            // Cập nhật lại collection
            var oldCollection = _card.getBoard().getCollectionByPosition(_card.itemBefore.position);
            oldCollection && oldCollection.drawOnBoard();

        }
        //1
        // Nếu oldPosition là hand thì xóa thẻ div cha
        if (willRemove.length) {
            willRemove.remove();
        }
        fireEvent && _card.afterMove(newPosition);
        setTimeout(function () {
            _card.moveAnimation(moveContainer);
            setTimeout(function () {
                _card.endBoardAnimation(moveContainer);
                _card.appendToBoard(); // End animation of the card
            }, 400);

            if (isOverlay) {
                if (newPosition != 'summon') {
                    _card.isOverlay = false;
                    _card.detachAllOverlap();
                    board.checkOverlaySlot(_card.collection_order);
                } else {

                }
            }
        }, 5);
        return result;
    }

    // fold state: normal / fold
    fold(newState, animation, duration) {
        if (!['normal', 'fold'].includes(newState)) return false;
        var result = false;
        if (this.canFlip(newState)) {

            if (animation) this.doAnimation(newState, animation, duration);
            var oldFlipState = this.foldState;
            this.foldState = newState;
            // set new state here
            this.html.removeClass('normal fold').addClass(newState);
            result = true;

            var collection = this.getBoard().getCollectionByPosition(this.get('position'));
            collection && collection.drawOnBoard();
        } else {
            // console.warn( 'Failed to update foldState to ' + newState );
        }
        result && this.getBoard().writelog('update', this.uuid, {
            foldState: newState,
        }, {
            foldState: oldFlipState
        });
        return result;

    }
    // attack / defense state
    attack(animation, duration) {
        this._switchAttack('attack', animation, duration);
    }
    defense(animation, duration) {
        this._switchAttack('defense', animation, duration);
    }
    _switchAttack(newState, animation, duration) {
        if (!['attack', 'defense'].includes(newState)) return false;
        var result = false;
        if (this.canSwitch(newState)) {

            // 1
            if (animation) this.doAnimation(newState, animation, duration);
            // 1
            var oldSwitchState = this.switchState;
            this.switchState = newState;
            // set new state here
            // this.html.removeClass('fold');
            // this.html.removeClass('attack defense').addClass(newState);
            this.updateHtml();

            this.getBoard().writelog('update', this.uuid, {
                switchState: newState,
            }, {
                switchState: oldSwitchState
            });
            result = true;
        }

        return result;
    }
    setDataOverlap(new_order) {
        var card = this;
        card.isOverlap = true;
        card.isOverlay = false;
        card.overlap_order = new_order;
        card.switchState = 'attack';
        card.foldState = 'normal';
        card.updateHtml();
    }

    setDataOverlay(new_order) {
        var card = this;
        card.isOverlap = false;
        card.isOverlay = true;
        card.overlap_order = new_order;
        // card.switchState = 'attack';
        card.foldState = 'normal';
        card.updateHtml();
    }
    target() {
        this.doAnimation('target');
        this.getBoard().writelog('target', this.uuid, {});
    }

    declare() {
        this.doAnimation('declare');
        this.getBoard().writelog('declare', this.uuid, {});
        // Surface the declaring card in the side info panel, but only in
        // Advanced view (the panel is hidden in Basic mode / small screens).
        if (!$('.play-board-container').hasClass('basic-mode')) {
            this.getBoard().showCardInfo(this);
        }
    }
    reveal() {
        this.getBoard().writelog('reveal', this.uuid, {});
        // Show image as full screen
        this.doAnimation('reveal');
        if (this.position === 'exdeck') {
            // then move to the Top of the extra deck
            let collection = this.getBoard().getCollectionByPosition(this.position);
            collection && collection.appendCard(this);
        }

    }

    // Draw
    drawHtml() {
        var _card = this;
        var backImageSrc = this.options.imgPath + this.options.backImageSrc;
        var frontImageSrc = this.imageURL || (this.options.imgPath + 'card/' + this.name + '.jpeg');
        var uuid = this.uuid;
        var cardElement = $(`<div id="card-${uuid}" class="simulator-card card-id-${uuid}" data-id="${uuid}" title="${_card.name}"/>`);
        // var moveOptions = [
        //     'canMoveHand',
        //     'canMoveSummon',
        //     'canMoveExDeck',
        //     'canMoveDeck',
        //     'canMoveST',
        //     'canMoveBanish',
        //     'canMoveGraveyard',
        // ];
        // moveOptions.forEach( function( moveOption ) {
        //     if (_card[moveOption] || 1 ) {
        //         cardElement.addClass(moveOption);
        //     }
        // });
        var typeCards = [
            'isST',
            'isSpell',
            'isTrap',
            'isMonster',
        ];
        typeCards.forEach(function (typeCard) {
            if (_card[typeCard] || 1) {
                cardElement.toggleClass(typeCard, (typeCard in _card) && (_card[typeCard] == 1));
            }
        });
        var states = [
            'foldState',
            'switchState',
            'position',
        ];
        states.forEach(function (stateName) {
            if (_card[stateName]) {
                cardElement.addClass(_card[stateName]);
                cardElement.data(stateName, _card[stateName]);
            }
        });

        cardElement.append(`<span class="card-name">${_card.name}</span>`);
        cardElement.append(`
                <div class="card-imgs">
                    <img src="${backImageSrc}" class="card-img back-image"/>
                    <img src="${frontImageSrc}" width="70" height="102" class="card-img front-image""/>
                </div>`);

        this.html = cardElement;

    }
    updateHtml() {
        var _card = this;
        var board = _card.getBoard();
        var cardElement = _card.html;

        var typeCards = [
            'isST',
            'isSpell',
            'isTrap',
            'isMonster',
        ];
        typeCards.forEach(function (typeCard) {
            if (_card[typeCard] || 1) {
                cardElement.toggleClass(typeCard, (typeCard in _card) && (_card[typeCard] == 1));
            }
        });
        var states = [
            'foldState',
            'switchState',
            'position',
        ];
        cardElement.removeClass('normal fold attack defense deck exdeck graveyard banish summon st hand fz overlay overlap');
        states.forEach(function (stateName) {
            if (_card[stateName]) {
                cardElement.addClass(_card[stateName]);
                cardElement.data(stateName, _card[stateName]);
            }
        });
        var overlaps = {
            'isOverlay': 'overlay',
            'isOverlap': 'overlap'
        };
        Object.entries(overlaps).forEach(function ([stateName, className]) {
            if (_card[stateName]) {
                cardElement.addClass(className);
            }
        });

    }
    appendToBoard() {
        var _card = this;
        var _board = _card.getBoard();
        // Guard against stale cards. The startup flow builds the board twice:
        // `new Board(state.items)` (whose constructor draws an opening hand via
        // deckToHand) and then importState(), which calls emptyBoard() and
        // rebuilds fresh Card objects from the saved positions. The opening-hand
        // draw finishes its move animation on a setTimeout, so those deferred
        // callbacks fire AFTER the rebuild and would re-insert orphan card html
        // into the hand. A stale card is no longer the board's registered card
        // for its uuid (importState replaced it), so skip the DOM insertion.
        if (_board.getItemById(_card.uuid) !== _card) return false;
        var hand = _board.getHandElm();
        var position = _card.get('position');
        switch (position) {
            case 'deck':
            case 'exdeck':
            case 'graveyard':
            case 'banish':
                var collection = _board.getCollectionByPosition(position);
                collection && collection.appendCard(_card);
                collection && collection.drawOnBoard();
                break;

            case 'summon':
                // var summonElm = _board.getFreeSummon();

                var summonElm = _board.getCardSlot(_card.uuid);
                if (!summonElm.length) {
                    return false;
                }
                _card.updateHtml();
                if (_card.isOverlap || 0) {
                    _card.html.prependTo(summonElm);
                } else {
                    _card.html.appendTo(summonElm);
                }

                break;
            case 'st':
                // var stElm = _board.getFreeST();
                var stElm = _board.getCardSlot(_card.uuid);
                if (!stElm.length) {
                    return false;
                }
                _card.updateHtml();
                _card.html.appendTo(stElm);

                break;

            case 'fz':
                var fzElm = _board.getCardSlot(_card.uuid);
                if (!fzElm.length) {
                    return false;
                }
                _card.updateHtml();
                _card.html.appendTo(fzElm);

                break;

            case 'hand':
                hand.append($('<div class="hand-card-container" />').append(_card.html));
                break;
            default:
                return false;

        }
        hand.find('.hand-card-container').filter(function (index, container) {
            return $(container).is(':empty');
        }).remove();
        return true;
    }

    // get / set
    getBoard() {
        return this.Board;
    }
    get(k, defaultValue) {
        if (this[k]) return this[k];
        return defaultValue || false;
    }

    // this.doAnimation('target', '<animation name>', <duration>); details in https://animate.style

    /**
     * Do the card animation
     * @param {string} action Action name, from the action on board
     * @param {string} animation animation name, get from animate.style
     * @param {number} duration duration time by miliseconds default 300
     * @param {function} callback callback function after animation
     * @returns void
     */
    doAnimation(action, animation, duration, callback) {
        var _card = this;
        duration = duration || 1000;

        switch (action) {
            // case 'declare':
            //     animation = animation || 'shakeY';
            case 'target':
                animation = animation || 'bounceIn';
                animation = 'animate__animated animate__' + animation;
                this.playSoundAnimation(action);
                this.html.addClass(animation);
                setTimeout(function () {
                    _card.html.removeClass(animation);
                }, duration);
                break;


            case 'declare':
            case 'reveal':
                var in_class = (action == 'declare') ? 'animate__zoomInDown' : 'animate__jackInTheBox';
                var out_class = 'animate__zoomOut';
                // Show card in full screen;
                var board = _card.getBoard();
                var boardElm = board.getBoardElm();
                boardElm.find('#card-lightbox').remove();
                var lightbox = $('<div></div>', {
                    'id': 'card-lightbox',
                    'class': 'lightbox-container',
                });
                lightbox.append(
                    `<div class="card-lightbox-inner lightbox-inner">
                            <div class="image-cont animate__animated ${in_class}">
                                <img src="${_card.imageURL}" data-width="481" data-height="701"  />
                            </div>
                        </div>`,
                );
                boardElm.append(lightbox);
                this.playSoundAnimation(action);
                const waitTime = 1000;
                setTimeout(function () {
                    lightbox.removeClass(`animate__animated ${in_class}`).addClass(` animate__animated ${out_class}`);
                    setTimeout(function () {
                        lightbox.remove();
                    }, duration);
                }, duration + waitTime);
                break;


            default:
                return false;
        }
        if (callback) callback();
    }

    playSoundAnimation(action, delay) {
        var board = this.getBoard();
        var soundElm = board.elm.find('.animation-sound').filter('.' + action + '-sound-effect');
        if (soundElm.length) {
            delay = delay || 100;
            setTimeout(function () {
                soundElm[0].play();
            }, delay);
        }
    }
    startMoveAnimation(moveParent = false) {
        var card = this;
        var board = card.getBoard();
        var oldPosition = card.position;
        var clone = {};
        var orgElm = moveParent ? card.html.parent() : card.html;
        var clone = orgElm.clone();
        var offset = [];
        var collection = board.getCollectionByPosition(oldPosition);
        if (collection) {
            offset = collection.elm.offset();
        } else {
            offset = card.html.offset();
        }
        clone.attr('id', '');
        clone.css({
            width: orgElm.width(),
            height: orgElm.height(),
        });

        var moveContainer = $('<div class="move-container"></div>');
        moveContainer.css({
            top: offset.top,
            left: collection ? (collection.elm.width() - card.html.width()) / 2 + offset.left : offset.left,
            width: card.html.width(),
            height: card.html.height(),
            zIndex: 1000,
        }).appendTo($('body'));

        clone.appendTo(moveContainer);
        return moveContainer;
    }
    moveAnimation(moveContainer) {
        var card = this;
        var board = card.getBoard();
        var newPosition = card.position;
        var collection = board.getCollectionByPosition(newPosition);
        var offset = [];
        var clone = moveContainer.find('.simulator-card');
        clone.css({
            width: card.html.width(),
            height: card.html.height(),
        });

        if (collection) {
            offset = collection.elm.offset();
        } else {
            offset = card.html.offset();
        }
        moveContainer.css({
            top: offset.top,
            left: collection ? (collection.elm.width() - clone.width()) / 2 + offset.left : offset.left,
            zIndex: 1000,
        });

        // Keep the animations;
        clone[0].classList = 'simulator-card';
        clone.addClass(card.html[0].classList.value);
        return true;
    }
    startBoardAnimation(moveContainer, isSiblings = false) {
        this.html.css('visibility', 'hidden');
        var siblings = isSiblings && this.html.siblings();
        siblings && siblings.css('visibility', 'hidden');
        moveContainer && moveContainer.show();

    }
    endBoardAnimation(moveContainer) {
        this.html.css('visibility', 'visible');
        var siblings = this.html.siblings();
        siblings && siblings.css('visibility', 'visible');
        moveContainer && moveContainer.remove();
    }

    /* The functions for Overlay feature */
    canDoOverlay() {
        var card = this;
        var board = card.getBoard();

        if (card.position != 'summon') return false;
        if (board.canDoOverlay(card)) return true;

        return false;

    }

    detachAllOverlap() {
        var card = this; // overlay card
        var board = card.getBoard();
        var order = card.itemBefore.collection_order;
        var overlapCards = board.getItemsByCollectionOrder(order);
        if (overlapCards.length) {
            overlapCards.forEach(function (overlapCard) {
                overlapCard.detachOverlap(false);
            });
        }
        return true;
    }

    detachOverlap(writelog = true) {
        // target = 'graveyard,atk';
        var card = this;
        var board = card.getBoard();
        card.isOverlap = false;
        board.updateCardbyAction(card, 'graveyard', '', '', '', false);
        writelog && board.writelog('detach', card.uuid);
        board.checkOverlaySlot(card.itemBefore.collection_order);
        return true;

    }
    goBanishOverlap() {
        var card = this;
        var board = card.getBoard();
        card.isOverlap = false;
        board.updateCardbyAction(card, 'banish', '', '', '');
        board.checkOverlaySlot(card.itemBefore.collection_order);
        return true;
    }

    /* END The functions for Overlay feature */
}

// Desk, ExDeck, Graveyar, Banish
class Collection {
    constructor(options) { // Board, name, elm, menuElm, options){
        var _default = {
            'Board': {},
            'name': '',
            'elm': '',
            'menuElm': '', // Đây là dialog, đặt tên nhầm
            'options': {},
            'collection_position': '',
        };
        $.extend(this, _default, options);
        this.init();
    }
    init() {
        if (!this.menuElm.length) {
            console.error('menuElm no found');
        }
        if (!this.elm.length) {
            console.error('Collection elm no found');
        }
        this.drawDialog();
        this.events();
    }
    events() {
        var collection = this;
        var _board = collection.getBoard();
        this.elm.on('click', '.simulator-card img, .collection-count, .ddescription', function () {
            if (collection.collection_position == 'deck') {
                return false;
            }
            collection.showDialog();
        });

        // Remove the event when click on card
        // this.menuElm.on('click', '.simulator-card img', function(){
        //     var _cardElm = $(this).closest('.simulator-card');
        //     var _uuid = _cardElm.data('id');
        //     var _card = _board.getItemById( _uuid );
        //     _card.moveTo('hand');
        // } );

        // Current, only Deck and extra deck have menu
        // but exDeck have only 1 item show skip it
        if (collection.getPosition() == 'deck') {
            this.elm.hover(function (e) {
                var _board = collection.getBoard();
                var collectionMenu = _board.collectionMenu.setCollection(collection);

                collectionMenu.show();
            }, function (e) {
                var _board = collection.getBoard();
                var collectionMenu = _board.collectionMenu;
                collectionMenu.element.dialog('option', 'appendTo', 'body');
                collectionMenu.hide();
            });
        }
    }
    getCards() {
        return this.getBoard().getItemsByPosition(this.collection_position);
    }
    getTopCard() {
        var cards = this.getCards();
        let card = cards.length ? cards[cards.length - 1] : false;
        return card;
    }

    // Draw the last card of collection on the board
    // Draw a clone of card.html, do not draw card.html
    drawOnBoard() {
        var cards = this.getCards();
        // count cards
        this.elm.find('.simulator-card').remove();
        this.elm.find('.collection-count').children().first().empty().text(cards.length);

        // TODO: check and draw top card with status;
        if (cards.length > 0) {
            var topCard = this.getTopCard();
            this.elm.prepend(topCard.html.clone().attr('id', ''));
        }
    }
    drawDialog() {
        var collection = this;
        // if( this.menuElm.length ){
        var dialog = this.menuElm.dialog({
            width: 450,
            height: collection.getBoard().getBoardElm().height(),
            resizable: true,
            draggable: true,
            autoOpen: false,
            modal: true, // Overlay mode
            open: function (event, ui) {
                var _dialog = $(this);
                $('.ui-widget-overlay').unbind('click').bind('click', function (e) {
                    _dialog.dialog('close');
                });
            },
            close: function (event, ui) {
                $('.ui-widget-overlay').unbind('click');

            },
            position: {
                my: "top center",
                at: "top center",
                of: '#playtest'
            },
            classes: {
                'ui-dialog-titlebar': 'collection-titlebar',
                'ui-dialog': 'ui-dialog-collection-menu',
            },
        });
        // this.menuElm = dialog;

        // }
    }
    showDialog() {
        var collection = this;
        this.menuElm.dialog('option', 'width', Math.min(450, $(window).width() - 10));
        this.menuElm.dialog('option', 'height', collection.getBoard().getBoardElm().height());
        this.menuElm.dialog('open');
    }
    // show Collection board
    showCollection() {
        this.showDialog();
    }
    getCollectionItems() {
        var _board = this.getBoard();
        return _board.getCollectionItems(this.collection_position);
    }
    getBoard() {
        return this.Board;
    }
    getName() {
        return this.name;
    }
    getPosition() {
        return this.collection_position;
    }

    // add / remove card
    appendCard(card, reDraw) {
        // if( reDraw || 0 ){
        card.position = this.collection_position;
        let top_order = 0;
        let top_card = this.getTopCard();
        if (top_card) top_order = top_card.collection_order;
        card.collection_order = top_order + 1;
        card.updateHtml();

        // }
        this.reDraw();

        // card.html.appendTo(this.menuElm.find('.collection-container'));
        return true;
    }
    reDraw() {
        var collection = this;
        var cards = collection.getCards();
        cards.forEach(card => {
            card.html.prependTo(this.menuElm.find('.collection-container'));
        });
        return true;
    }
    shuffleCollectionCards() {
        var _board = this.getBoard();
        var data = [];
        var collection = this;
        var items = collection.getCards();
        // var shuffledArr = items.sort(() => Math.random() - 0.5);
        items.sort(() => Math.random() - 0.5);
        $.each(items, function (index, item) {
            _board.updateItem(item.uuid, 'collection_order', index + 1);
        });
        this.reDraw();
        items.forEach(function (item, index) {
            var itemdata = {};
            $.each(['uuid', 'collection_order', 'order'], function (i, k) {
                itemdata[k] = item[k];
            });
            data.push(itemdata);
        });

        if (_board.playlog) _board.writelog('shuffle_deck', undefined, data);
    }

}
class Board {
    constructor(elm, data, options) {
        this.elm = elm;
        this.orgitems = data;
        var defaultOptions = {
            backImageSrc: 'back_card.png',
            imgPath: 'asset/',
            cardUUIdkey: 'uuid', // Define the field will be the UUID key of the card
            defaultPhase: 'm1',
            player: 'Player',
        };
        this.options = $.extend(defaultOptions, options);

        this.player = this.options.player;
        /**
        DP (Draw Phase)
        SP (Stand By)
        M1 (Main Phase 1)
        BP (Battle Phase)
        M2 (Main Phase 2)
        EP (End Phase)
        */

        this.phases = {
            dp: 'Draw Phase',
            sp: 'Stand By',
            m1: 'Main Phase 1',
            bp: 'Battle Phase',
            m2: 'Main Phase 2',
            ep: 'End Phase'
        };
        this.init();
        this.deckToHand(5, 'top');
        this.version = '1.0';
    }
    init() {
        this.deckElm = this.elm.find('#deck-slot');
        this.exDeckElm = this.elm.find('#extra-deck-slot');
        this.handElm = this.elm.find('#hand-board');
        this.graveyardElm = this.elm.find('#graveyard-slot');
        // this.summonElm = this.elm.find('#summon-slot');
        // this.stElm = this.elm.find('#st-slot');
        this.banishElm = this.elm.find('#banish-slot');

        this.deckMenuElm = $('#deckmenu');
        this.exDeckMenuElm = $('#extradeckmenu');
        this.graveyardMenuElm = $('#graveyardmenu');
        this.banishMenuElm = $('#banishmenu');

        this.cardMenuElm = $('#cardMenu');
        this.collectionMenuElm = $('#collectionMenu');
        this.currentPhase = this.options.defaultPhase || 'm1';
        this.initPhase(this.currentPhase);
        this.initDeck();
        this.initExDeck();
        this.initGraveyard();
        this.initBanish();
        this.initItems(this.orgitems);

        this.initMenus();
        this.initSkill();

        this.shuffleCards();
        this.events();
        this.playlog = new PlayLog({
            'Board': this,
            'name': 'PlayLog',
            'elm': $('.log-message-container'),
            'options': this.options,
            'initItems': { ... this.getItems() }
        });

        // this.writelog('init',undefined, {... this.getItems() }, `<p> Initialized board with ${this.items.length} cards</p>`);

    }
    // Remove all Item and HTML elements
    emptyBoard() {
        var board = this;
        board.items = [];
        board.elm.find('.simulator-card').remove();
        board.elm.find('.card-slot').removeClass('overlay-slot');
        $.each(['deckMenuElm', 'exDeckMenuElm', 'graveyardMenuElm', 'banishMenuElm', 'cardMenuElm', 'collectionMenuElm'], function (index, elm) {
            board[elm].find('.collection-container').empty();
        });
        $.each(board.elm.find('.collection-count'), function (i, collectionElm) {
            $(collectionElm).children().first().empty().text('');
        });
    }
    initItems() {
        var _board = this;
        this.items = [];
        this.orgitems.forEach(function (item) {
            if (_board.validateBeforeAddItem(item)) {
                _board.addItem(item);
            }
        });
    }
    checkOverlayWhenInit() {
        this.items.forEach(card => {
            if (card.isOverlay) {
                let cardSlot = card.html.closest('.card-slot');
                cardSlot && cardSlot.addClass('overlay-slot');
            }
        });
    }

    initPhase() {
        this.setPhase(this.currentPhase);
    }
    initDeck() {
        // this.deck = new Collection( this, 'deck', this.deckElm, this.deckMenuElm,this.options);
        this.deck = new Collection({
            'Board': this,
            'name': 'Deck',
            'elm': this.deckElm,
            'menuElm': this.deckMenuElm,
            'options': this.options,
            'collection_position': 'deck',
        });
    }
    initExDeck() {
        // this.exdeck = new Collection( this, 'exdeck', this.exDeckElm, this.exDeckMenuElm, this.options);
        this.exdeck = new Collection({
            'Board': this,
            'name': 'Extra Deck',
            'elm': this.exDeckElm,
            'menuElm': this.exDeckMenuElm,
            'options': this.options,
            'collection_position': 'exdeck',
        });
    }
    initGraveyard() {
        // this.graveyard = new Collection( this, 'graveyard', this.graveyardElm, this.graveyardMenuElm, this.options);
        this.graveyard = new Collection({
            'Board': this,
            'name': 'Graveyard',
            'elm': this.graveyardElm,
            'menuElm': this.graveyardMenuElm,
            'options': this.options,
            'collection_position': 'graveyard',
        });

    }
    initBanish() {
        // this.banish = new Collection( this, 'banish', this.banishElm, this.banishMenuElm, this.options);
        this.banish = new Collection({
            'Board': this,
            'name': 'Banish',
            'elm': this.banishElm,
            'menuElm': this.banishMenuElm,
            'options': this.options,
            'collection_position': 'banish',
        });

    }
    initMenus() {
        // var _board = this;
        this.cardMenu = new CardMenu(this.cardMenuElm);
        this.collectionMenu = new CollectionMenu(this.collectionMenuElm);
    }
    initSkill() {
        var board = this;
        board.skill = {
            activated: false,
            name: (board.skill && board.skill.name) || (board.options.skill || "")
        };
        if (board.skill.name) {
            board.skillBtn = $('<input>', {
                value: `Activate ${board.skill.name}`,
                type: 'button',
                class: 'skill-btn'
            });
            board.elm.find('.actions').find('.skill-btn').remove();
            board.elm.find('.actions').find('.action-btns').append(board.skillBtn);
        }
    }

    // START Events
    events() {
        this.cardHoverEvents();
        this.removeOverlayHighlight();
        this.selectOverlayEvent();
        this.removeHighlight();
        this.selectOrderEvent();
        this.selectPhases();
        this.skillEvents();
        return true;
    }
    cardHoverEvents() {
        var board = this;
        var showMenu = function () {
            var uuid = $(this).data('id');
            var card = board.getItemById(uuid);
            if (!card) return;
            var cardMenu = board.cardMenu.setCard(card);
            cardMenu.sideCardInformations();
            cardMenu.show();
        };
        var hideMenu = function () {
            var cardMenu = board.cardMenu;
            cardMenu.hide();
            cardMenu.element.dialog('widget').appendTo('body');
            cardMenu.element.dialog('option', 'appendTo', 'body');
        };

        // Delegate hover to the board element AND to the four collection
        // "View" dialogs (deck / extra deck / graveyard / banish). jQuery UI
        // relocates each dialog under <body> (default appendTo: 'body'), so the
        // cards shown inside a "View" popup are NOT descendants of board.elm —
        // a board-only listener never sees them and their hover menu goes dead.
        // Binding the same delegation to each dialog element (which still holds
        // its cards after being moved) restores the hover menu there too.
        // Namespaced + .off first so re-constructing the Board (importState /
        // replay) rebinds cleanly instead of stacking duplicate handlers.
        var hoverRoots = board.elm
            .add(board.deckMenuElm)
            .add(board.exDeckMenuElm)
            .add(board.graveyardMenuElm)
            .add(board.banishMenuElm);
        hoverRoots
            .off('mouseenter.cardHover mouseleave.cardHover', '.simulator-card')
            .on('mouseenter.cardHover', '.simulator-card', showMenu)
            .on('mouseleave.cardHover', '.simulator-card', hideMenu);
    }
    removeOverlayHighlight() {
        var board = this;
        board.elm.on('click', function (e) {
            var willRemove = false;
            var _elm = $(e.target);
            if (_elm.closest('.ui-dialog').length) {
                return;
            }
            if (_elm.closest('.card-slot.highlight').length) {
                return;
            }
            if (_elm.closest('.ui-dialog').length) {
                return;
            }
            willRemove = true;

            var highlightElms = board.elm.find('.card-slot.overlay-highlight');
            if (highlightElms) {
                $.each(highlightElms, function (index, highlight) {
                    // console.warn('remove highlighting' + this.classes)
                    $(highlight).removeClass('waiting-overlay overlay-highlight');
                });
                board.setWaitingActions(false);
            }
        });
    }

    // Do overlay when select the target 
    selectOverlayEvent() {
        var board = this;
        this.elm.on('click', '.waiting-overlay', function (e) {
            var _this = $(this);
            var order = _this.data('order');
            var getWaitingOverlay = board.getWaitingOverlay();
            var card = getWaitingOverlay.card;
            if (order) {
                board.overlayCard(card.uuid, order);
                if (board.playlog) board.writelog('overlay', card.uuid, { order: order, uuid: card.uuid });
            }
            var highlightElms = board.elm.find('.card-slot.overlay-highlight');
            if (highlightElms) {
                $.each(highlightElms, function (index, highlight) {
                    // console.warn('remove highlighting' + this.classes)
                    $(highlight).removeClass('waiting-overlay overlay-highlight');
                });
                board.setWaitingActions(false);
            }
        });
    }
    removeHighlight() {
        var board = this;
        board.elm.on('click', function (e) {
            var willRemove = false;
            var _elm = $(e.target);
            if (_elm.closest('.ui-dialog').length) {
                return;
            }
            if (_elm.closest('.card-slot.highlight').length) {
                return;
            }
            if (_elm.closest('.ui-dialog').length) {
                return;
            }
            willRemove = true;

            var highlightElms = board.elm.find('.card-slot.highlight');
            if (highlightElms) {
                $.each(highlightElms, function (index, highlight) {
                    // console.warn('remove highlighting' + this.classes)
                    $(highlight).removeClass('highlight');
                });
                board.setWaitingActions(false);
            }
        });
    }
    selectOrderEvent() {
        var board = this;
        this.elm.on('click', '.highlight', function (e) {
            var _this = $(this);
            var order = _this.data('order');
            var waitingActions = board.getWaitingActions();
            let newPosition = _this.data('position');

            if (order) {
                board.updateCardbyAction(
                    waitingActions.card,
                    newPosition,
                    order,
                    waitingActions.newState, waitingActions.isFD
                );
            }
            var highlightElms = board.elm.find('.card-slot.highlight');
            if (highlightElms) {
                $.each(highlightElms, function (index, highlight) {
                    // console.warn('remove highlighting' + this.classes)
                    $(highlight).removeClass('highlight');
                });
                board.setWaitingActions(false);
            }
        });
    }
    selectPhases() {
        var board = this;
        this.elm.on('click', '.phase-btn', function (e) {
            // var phase = $(this).data('phase');
            var phase = $(this).val();
            phase && board.phases[phase] && board.setPhase(phase);
        });
    }
    skillEvents() {
        var board = this;
        board.skillBtn && board.skillBtn.on('click', function () {
            board.activateSkill();
        });
    }
    beforeReplay() {
        this.skillBtn?.fadeOut();
    }
    afterReplay() {
        this.skillBtn?.fadeIn();

    }
    // END Events
    // Add, update, remove
    validateBeforeAddItem(item) {
        return true;
    }
    addItem(item, order) {
        order = order || (this.items.length + 1);
        var card = new Card(this, item, order, this.options);
        this.items.push(card);
        card.appendToBoard();
    }
    updateItem(id, k, v) {
        var card = this.getItemById(id);
        card[k] = v;
        card.updateHtml();

        // Update Card display on Board
        // if( ! ['foldState', 'switchState'].includes(k) ){
        card.appendToBoard();
        // }

        // Update Collection display on Board
        var collection = this.getCollectionByPosition(card.position);
        collection && collection.drawOnBoard();

        return card;
    }
    shuffleCards() {
        var _board = this;
        var items = _board.getItems();
        // var shuffledArr = items.sort(() => Math.random() - 0.5);
        items.sort(() => Math.random() - 0.5);
        $.each(items, function (index, item) {
            _board.updateItem(item.uuid, 'collection_order', index + 1);
            _board.updateItem(item.uuid, 'order', index + 1);
        });
        if (this.playlog) this.writelog('shuffle', undefined, { ...this.items });
    }

    // Move
    moveCard(card, to, isTop) {
        card.moveTo(to, isTop);
    }
    deckToHand(count, from) {
        var _board = this;
        var deckItems = _board.getDeckItems();
        var length = deckItems.length;
        var end = Math.max(length - count, 0) - 1;
        for (var i = length - 1; i > end; i--) {
            deckItems[i].moveTo('hand');
        }
    }

    // get / set
    getItems() {
        return this.items;
    }
    getLength() {
        return this.items.length;
    }

    getCollectionItems(collection_position) {
        return this.getItemsByPosition(collection_position);
    }
    getItemsByPosition(position) {
        var items = this.items.filter(function (item) {
            return item.position == position;
        });

        items.sort(function (a, b) {
            return a.collection_order > b.collection_order ? 1 : -1;
        });
        if (!['summon', 'st', 'fz'].includes(position)) {
            items.forEach(function (item, index) {
                item.collection_order = index + 1;
            });
        }
        return items;
    }
    getItemsByCollectionOrder(collection_order) {
        var items = this.items.filter(function (item) {
            return item.collection_order == collection_order;
        });
        items.sort(function (a, b) {
            return ((a.overlap_order || 1) > (b.overlap_order || 1)) ? 1 : -1;
        });
        return items;
    }
    getDeckItems() {
        return this.getItemsByPosition('deck');

    }
    getExDeckItems() {
        return this.getItemsByPosition('exdeck');
    }
    getExtraDeckItems() {
        return this.getItemsByPosition('exdeck');
    }
    getGraveyardItems() {
        return this.getItemsByPosition('graveyard');
    }
    getBanishItems() {
        return this.getItemsByPosition('banish');
    }
    getHandItems() {
        return this.getItemsByPosition('hand');
    }
    getSummonItems() {
        return this.getItemsByPosition('summon');
    }
    getStItems() {
        return this.getItemsByPosition('st');
    }
    getFzItems() {
        return this.getItemsByPosition('fz');
    }

    setItems(items) {
        this.orgitems = Object.values(items);
        this.initItems();
        this.checkOverlayWhenInit();
    }
    get(key, defaultValue) {
        if (typeof this[key] != 'undefined') {
            return this[key];
        }
        return defaultValue || undefined;
    }
    getFreeSummon() {
        var _free = [];
        $.each(this.elm.find('.summon-slot'), function (i, el) {
            var _el = $(el);
            if ((!_free.length) && (!_el.find('.simulator-card').length)) {
                _free = _el;
            }
        });
        return _free;
    }

    getFreeFZ() {
        var _free = [];
        $.each(this.elm.find('.fz-slot'), function (i, el) {
            var _el = $(el);
            if ((!_free.length) && (!_el.find('.simulator-card').length)) {
                _free = _el;
            }
        });
        return _free;
    }

    startLog() {
        this.writelog('startRecord', undefined, { ... this.getItems() }, {});
    }
    writelog(action, id, data, oldData) {
        // console.warn('writelog', action, id, data, oldData);
        return this.playlog.addStep(action, id, data, oldData || {});
    }
    stopLog() {
        this.writelog('stopRecord', undefined, { ... this.getItems() }, {});

    }

    // this is private function. do not call from outside
    updateCardbyAction(card, newPosition, order, newState, isFD, fireEvent = true) {
        var isTop = true;
        if (newState) {
            switch (newState) {
                case 'def':
                    card.defense();
                    break;
                case 'atk':
                    card.attack();
                    break;
                case 'fold':
                case 'normal':
                    card.fold(newState);
                    break;
                case 'target':
                    card.target();
                    break;

                case 'declare':
                    card.declare();
                    break;

                case 'reveal':
                    card.reveal();
                    break;

                case 'active':
                    newPosition = 'st';
                    // order = 5;
                    card.fold('normal');
                    break;

                case 'detach':
                    card.isOverlap = false;
                    break;

            }
        } else {
            card.attack();
            card.fold('normal');
        }
        if (isFD) {
            switch (isFD) {
                case 'bottom':
                    isTop = false;
                    break;
                case 'fold':
                case 'normal':
                    card.fold(isFD);
                    break;
                case 'toendST':
                    break;


            }
        }
        if (newPosition != 'this') {
            card.moveTo(newPosition, isTop, order, fireEvent);
        }
        return true;
    }
    setWaitingActions(data) {
        var board = this;
        this.waitingActions = data;
        if (!data) {
            board.elm.find('.card-slot.highlight').removeClass('highlight');
        }
    }
    setPhase(phase) {
        if (!(phase && this.phases[phase])) {
            phase = 'm1';
        }
        if (phase && this.phases[phase]) {

            if (this.currentPhase != phase) {
                // writelog(action, id, data, oldData)
                this.writelog('update-phase', undefined, phase, this.currentPhase);
            }
            this.currentPhase = phase;
            var boardElm = this.elm;
            boardElm.find('.phase-btn').removeClass('current-phase');
            boardElm.find('.phase-btn[value="' + phase + '"]').addClass('current-phase');

            this.playSoundAnimation('phase');
            //show a popup text (phase full name) in middle of the screen in 1 or 0.5 second. (similar to declare effect)
            this.doAnimation('enterPhase');

        }
    }
    playSoundAnimation(action, delay) {
        var board = this.getBoard();
        var soundElm = board.elm.find('.animation-sound').filter('.' + action + '-sound-effect');
        if (soundElm.length) {
            delay = delay || 100;
            setTimeout(function () {
                soundElm[0].play();
            }, delay);
        }
    }
    setSkill(skill) {
        var board = this;
        var defaultSkill = {
            name: '',
            activated: false,
        };
        board.skill = $.extend(defaultSkill, skill);
        board.options.skill = board.skill.name;
        board.skillBtn?.val("Activate " + board.skill.name);
    }
    activateSkill() {
        this.skill.activated = true;
        this.writelog('active-skill');
        this.doAnimation('activateSkill');
    }
    set(key, value) {
        this[key] = value;
    }
    getFreeST() {
        var _free = [];
        $.each(this.elm.find('.st-slot'), function (i, el) {
            var _el = $(el);
            if ((!_free.length) && (!_el.find('.simulator-card').length)) {
                _free = _el;
            }
        });
        return _free;
    }
    getActiveSkill() {
        return this.skill.activated && this.skill.name;
    }

    // Check SS / ST board free only one slot
    // return order of free slot if true
    // return false if wrong
    isSTFreeOne() {
        var frees = [];
        $.each(this.elm.find('.st-slot'), function (i, el) {
            var _el = $(el);
            if (!_el.find('.simulator-card').length) {
                frees.push(_el.data('order'));
            }
        });
        return frees.length == 1 ? frees[0] : false;
    }

    isSSFreeOne() {
        var frees = [];
        $.each(this.elm.find('.summon-slot'), function (i, el) {
            var _el = $(el);
            if (!_el.find('.simulator-card').length) {
                frees.push(_el.data('order'));
            }
        });
        return frees.length == 1 ? frees[0] : false;
    }

    isExSSFreeOne() {
        var frees = [];
        $.each(this.elm.find('.summon-slot, .exsummon-slot'), function (i, el) {
            var _el = $(el);
            if (!_el.find('.simulator-card').length) {
                frees.push(_el.data('order'));
            }
        });
        return frees.length == 1 ? frees[0] : false;
    }
    isSS_STFreeOne(card) {
        var frees = [];
        var ssstElms = [];
        if (card && card.isSpell) {
            ssstElms = this.elm.find('.summon-slot, .exsummon-slot, .st-slot, .fz-slot');
            // Hiện tại fz-slot chỉ áp dụng cho action "Move To" nên chỉ check ở đây 
        } else {
            ssstElms = this.elm.find('.summon-slot, .exsummon-slot, .st-slot');
        }
        $.each(ssstElms, function (i, el) {
            var _el = $(el);
            if (!_el.find('.simulator-card').length) {
                frees.push(_el);
            }
        });
        return frees.length == 1 ? frees[0] : false;
    }

    getItemById(id) {
        return this.items.filter(function (item) {
            return item.uuid == id;
        })[0];
    }
    getCard(id) {
        return this.getItemById(id);
    }
    getItemByName(name) {
        return this.items.filter(function (item) {
            return item.name == name;
        })[0];
    }
    getItemByOrder(order) {
        return this.items.filter(function (item) {
            return item.order == order;
        })[0];
    }
    getItemByPosition(position) {
        return this.items.filter(function (item) {
            return item.position == position;
        });
    }

    // Pick a random card the player can actually see: anything in hand, on the
    // field (summon/st/fz), graveyard, extra deck or banish, plus the top card
    // of the deck. Returns false when no such card exists.
    getRandomVisibleCard() {
        var pool = this.items.filter(function (item) {
            return ['hand', 'summon', 'st', 'fz', 'graveyard', 'banish', 'exdeck'].includes(item.position);
        });
        var deck = this.getCollectionByPosition('deck');
        var topDeck = deck && deck.getTopCard();
        if (topDeck) {
            pool.push(topDeck);
        }
        if (!pool.length) {
            return false;
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Render a card in the left "card information" panel (no-op on small screens).
    showCardInfo(card) {
        if (card && this.cardMenu) {
            this.cardMenu.setCard(card).sideCardInformations();
        }
    }

    // On load, fill the info panel with a random visible card instead of
    // leaving it blank until the user hovers a card.
    showRandomCardInfo() {
        this.showCardInfo(this.getRandomVisibleCard());
    }

    // get the elements
    getHandElm() {
        return this.handElm;
    }
    getGraveyardElm() {
        return this.graveyardElm;
    }
    getSummonElm() {
        return this.summonElm;
    }
    getStElm() {
        return this.stElm;
    }
    getBanishElm() {
        return this.banishElm;
    }
    getDeckElm() {
        return this.deckElm;
    }
    getExDeckElm() {
        return this.exDeckElm;
    }
    getBoardElm() {
        return this.elm;
    }
    getBoard() {
        return this;
    }
    getCollectionByPosition(position) {
        var collection = false;
        switch (position) {
            case 'deck':
                collection = this.deck;
                break;

            case 'exdeck':
                collection = this.exdeck;
                break;

            case 'graveyard':
                collection = this.graveyard;
                break;
            case 'banish':
                collection = this.banish;
                break;
        }
        return collection;
    }

    getGraveyardMenuElm() {
        return this.graveyardMenuElm;
    }
    getBanishMenuElm() {
        return this.banishMenuElm;
    }
    getDeckMenuElm() {
        return this.deckMenuElm;
    }
    getExDeckMenuElm() {
        return this.exDeckMenuElm;
    }
    getWaitingActions() {
        return this.waitingActions || false;
    }
    getCardSlot(uuid) {
        var board = this;
        var card = this.getItemById(uuid);

        var order = card.get('collection_order');
        var position = card.get('position');
        if (['summon', 'st', 'fz'].includes(position)) {
            var elm = board.elm.find('.card-slot[data-order="' + order + '"]');
            return elm;
        }
        return false;
    }
    selectOrder(isEx, isFz) {
        isEx = isEx || 0;
        var waitingActions = this.getWaitingActions();
        let cardHolders = false;
        let newPosition = waitingActions.newPosition;
        if (!newPosition) {
            cardHolders = this.highlightSS_STCardHolders(isEx, isFz); // 'Move action'
        } else if (newPosition == 'summon' && isEx) {
            cardHolders = this.highlightSSExCardHolders();
        } else {
            cardHolders = this.highlightCardHolders(newPosition);
        }
        return cardHolders;
    }
    highlightCardHolders(position) {
        var cardHolderElms = this.getCardHolder(position);
        this.elm.find('.card-slot ').removeClass('highlight');

        // Highlight when slot is empty
        var elms = cardHolderElms.filter(function (index, cardHolder) {
            var _cardHolder = $(cardHolder);
            if (!_cardHolder.find('.simulator-card').length) {
                _cardHolder.addClass('highlight');
                return true;
            }
            return false;
        });
        return elms;

    }
    highlightSSExCardHolders() {
        // position = 'summon';
        var cardHolderElms = this.elm.find('.summon-slot, .summonex-slot ');
        this.elm.find('.card-slot ').removeClass('highlight');

        // Highlight when slot is empty
        var elms = cardHolderElms.filter(function (index, cardHolder) {
            var _cardHolder = $(cardHolder);
            if (!_cardHolder.find('.simulator-card').length) {
                _cardHolder.addClass('highlight');
                return true;
            }
            return false;
        });
        return elms;

    }
    highlightSS_STCardHolders(isEx, isFz) {
        var waitingActions = this.getWaitingActions();
        var card = waitingActions.card;
        var cardHolderElms = this.elm.find('.summon-slot, .summonex-slot, .st-slot, .fz-slot ');
        this.elm.find('.card-slot ').removeClass('highlight');

        // Highlight when slot is empty
        var elms = cardHolderElms.filter(function (index, cardHolder) {
            var _cardHolder = $(cardHolder);
            var check = true;

            // if( !card.isMonster && _cardHolder.hasClass('summonex-slot') ){
            //     check = false;
            // }
            if ((!card.isSpell) && _cardHolder.hasClass('fz-slot')) {
                check = false;
            }
            if (_cardHolder.find('.simulator-card').length) {
                check = false;
            }

            if (check) _cardHolder.addClass('highlight');
            return check;
        });
        return elms;
    }
    getCardHolder(position) {
        var moreClass = '';
        var waitingActions = this.getWaitingActions();
        if (waitingActions) {
            let newPosition = waitingActions.newPosition;
            let card = waitingActions.card;
            if (newPosition == 'st' && card.isSpell) moreClass = ', .fz-slot';
        }

        return this.elm.find('.' + position + '-slot.card-slot ' + moreClass);
    }
    doAnimation(action, animation, duration, callback) {
        var board = this;
        duration = duration || 500;
        var waitTime = 500;
        switch (action) {
            case 'enterPhase':
                // Show text in full screen;
                var boardElm = board.getBoardElm();
                boardElm.find('#card-lightbox').remove();
                var lightbox = $('<div></div>', {
                    'id': 'phase-lightbox',
                    'class': 'lightbox-container',
                });
                lightbox.append(
                    `<div class="phase-lightbox-inner lightbox-inner">
                            <div class="image-cont animate__animated animate__zoomIn">
                                <p class="phase-lightbox-text">${board.phases[board.currentPhase]}</p>
                            </div>
                        </div>`,
                );
                boardElm.append(lightbox);
                setTimeout(function () {
                    lightbox.removeClass('animate__animated animate__zoomIn').addClass(' animate__animated animate__fadeOut');
                    setTimeout(function () {
                        lightbox.remove();
                    }, duration);
                }, duration + waitTime);
                break;

            case 'activateSkill':
                // Show text in full screen;
                var boardElm = board.getBoardElm();
                boardElm.find('#card-lightbox').remove();
                var skillLightbox = $('<div></div>', {
                    'id': 'skill-lightbox',
                    'class': 'lightbox-container',
                });
                skillLightbox.append(
                    `<div class="skill-lightbox-inner lightbox-inner">
                            <div class="image-cont animate__animated animate__zoomIn">
                                <p class="skill-lightbox-text">
                                    Activate 
                                    <span class="skill-name">${board.skill.name}</span>
                                </p>
                            </div>
                        </div>`,
                );
                boardElm.append(skillLightbox);
                setTimeout(function () {
                    skillLightbox.removeClass('animate__animated animate__zoomIn').addClass(' animate__animated animate__fadeOut');
                    setTimeout(function () {
                        skillLightbox.remove();
                    }, duration);
                }, duration + waitTime);
                break;



            default:
                return false;
        }
        if (callback) callback();
    }

    copyCardData(cards) {
        var items = [];
        $.each(cards, function (i, item) {
            // Copy the properties from the item to state
            items.push({
                uuid: item.uuid,
                cardId: item.cardId,
                itemBefore: {},
                isMonster: item.isMonster || false,
                isST: item.isST || false,
                isSpell: item.isSpell || false,
                isTrap: item.isTrap || false,
                amount: item.amount,
                collection_order: item.collection_order,
                foldState: item.foldState,
                isExtra: item.isExtra,
                name: item.name,
                order: item.order,
                position: item.position,
                switchState: item.switchState,
                imageURL: item.imageURL,
                description: item.description,
                isOverlap: item.isOverlap || 0,
                isOverlay: item.isOverlay || 0,
                overlap_order: item.overlap_order || 0,

            });
        });

        return items;
    }
    recursive_copy_object(obj) {
        var board = this;
        if (typeof obj == null || obj == undefined) return obj;
        if (typeof obj != 'object') return obj;
        if ($.isArray(obj)) {
            var new_obj = [];
            $.each(obj, function (i, v) {
                if (typeof v == 'object') new_obj.push(board.recursive_copy_object(v));
                else new_obj.push(v);
            });
            return new_obj;
        } else {
            var new_obj = {};
            $.each(obj, function (i, v) {
                if (i === 'onchange') return 0;
                if (typeof v == 'object') new_obj[i] = board.recursive_copy_object(v);
                else new_obj[i] = v;
            });
            return new_obj;
        }
    }

    /**
     * The functions for Overlay feature
     * the events were defined in the events group
     * selectOverlayEvent
     * removeOverlayHighlight
     */

    /**
     * 
     * @param {Card} card the card to overlay
     */
    canDoOverlay(card) {
        if (card.isOverlap) return false;
        var board = this;
        var card_order = card.collection_order;
        var canBeOverlayCards = board.canBeOverlayCards(card_order);
        return canBeOverlayCards.length;

    }
    // Only overlay on summon
    canBeOverlayCards(exclude) {
        var board = this;
        var canbeOverlayCards = board.getSummonItems().filter(function (card) {
            return (card.collection_order != exclude);
        });
        return canbeOverlayCards;
    }

    setWaitingOverlay(data) {
        this.waitingOverlay = data;
        var board = this;
        // this.waitingActions = data;
        if (!data) {
            // Fully tear down the overlay-select UI: remove the dashed highlight
            // AND the waiting-overlay class (the overlay cursor + click target),
            // so any non-overlay action cancels the whole overlay process.
            board.elm.find('.card-slot.overlay-highlight, .card-slot.waiting-overlay')
                .removeClass('overlay-highlight waiting-overlay');
        }
    }
    getWaitingOverlay() {
        return this.waitingOverlay || false;
    }

    // Chưa làm: nếu chỉ có 1 slot canBeOverlayCards thì đè luôn khỏi chờ
    selectOverlay() {
        var waitingOverlay = this.getWaitingOverlay();
        var card = waitingOverlay.card;
        var canBeOverlayCards = waitingOverlay.canBeOverlayCards;
        canBeOverlayCards.forEach(_overlaycard => {
            var slot = _overlaycard.html.closest('.card-slot');
            slot.addClass('waiting-overlay overlay-highlight');
        });
    }

    startDoOverlay(card) {
        var board = this;
        var card_order = card.collection_order;
        var canBeOverlayCards = board.canBeOverlayCards(card_order);
        if (canBeOverlayCards.length) {
            board.setWaitingOverlay({
                card: card,
                canBeOverlayCards: canBeOverlayCards,
            });
            board.selectOverlay();
        }

        return false;
    }

    overlayCard(card_uuid, new_order) {
        var board = this;
        var card = board.getCard(card_uuid);
        var currentOrder = card.collection_order;
        var cards = board.getItemsByCollectionOrder(currentOrder);
        var position = 'summon';
        var slot = board.getCardHolder(position).filter(function (index, cslot) {
            return $(cslot).data('order') == new_order;
        });
        if (cards.length) {
            cards.forEach(_card => {
                if (_card.uuid != card_uuid) {
                    board._updateOverlap(slot, _card, new_order);

                }
            });
        }
        board._updateOverlay(slot, card, new_order)
    }

    /* Non public function. Please call overlayCard(uuid, order) */
    _updateOverlap(slot, card, new_order) {
        var board = this;
        var slot = $(slot);
        var overlapCards = board.getItemsByCollectionOrder(new_order);
        var max_order = 0;
        if (overlapCards.length) overlapCards.forEach(function (overlapCard, index) {
            max_order = Math.max(max_order, overlapCard.overlap_order);
        });
        card.collection_order = new_order;
        card.setDataOverlap(max_order + 1);
        card.html.appendTo(slot);
    }
    /* Non public function. Please call overlayCard(uuid, order) */
    _updateOverlay(slot, card, order) {
        var board = this;

        var overlapCards = board.getItemsByCollectionOrder(order);
        var max_order = 0;
        slot.addClass('overlay-slot');
        if (overlapCards.length) overlapCards.forEach(function (overlapCard, index) {
            overlapCard.setDataOverlap(index + 1);
            max_order = overlapCard.overlap_order;
        });
        card.setDataOverlay(max_order + 1);

        // Before animation 

        card.collection_order = order;
        card.updateHtml();

        // Animation 


        card.html.appendTo(slot);

        // End animation
    }

    checkOverlaySlot(order) {
        var board = this;
        var slot = board.getCardHolder('summon').filter(function (index, cslot) {
            return $(cslot).data('order') == order;
        });
        var cards = board.getItemsByCollectionOrder(order);
        if (cards.length > 1) {
            slot.addClass('overlay-slot');
        } else {
            slot.removeClass('overlay-slot');
        }
        if (cards.length == 1) {
            cards[0].isOverlay = false;
            cards[0].isOverlap = false;
        }

    }


    /* END The functions for Overlay feature */

    // Export and import state
    exportState(type = 'array') {
        var board = this;
        var items = board.copyCardData(board.getItems());
        var playLog = board.get('playlog');
        var playLogData = {
            initItems: board.copyCardData(playLog.initItems),
            steps: board.recursive_copy_object(playLog.steps),
            isPausing: false,
            isRePlaying: false,
            isStarted: false,
            pointer: 0
        }
        var data = {
            dateCreate: (new Date()).toISOString(),
            items: items,
            version: board.version,
            playLogData: playLogData,
            currentPhase: board.currentPhase,
            skill: board.skill,
        };
        type = (type || 'array').toLowerCase();
        switch (type) {
            case 'json':
                return JSON.stringify(data);
                break;
            case 'other cases':

                break
        }
        // default array;
        return data;
    }
    importState(state) {
        var board = this;
        // Hardening (task 0A-3): reject malformed/oversized/untrusted payloads
        // before any board rebuild happens. Throws like checkData() does.
        var guard = StateGuards.validateBoardState(state);
        if (!guard.ok) {
            throw new Error('importState rejected: ' + guard.error);
        }
        board.emptyBoard();
        board.playlog.reset();
        state = board.checkStateType(state);
        var data = board.checkData(state);
        var items = board.parseDataFromState(data);
        board.setItems(items);
        board.setPhase(state.currentPhase);
        board.setSkill(state.skill);
        var playLog = board.get('playlog');
        if ('playLogData' in state) {
            for (const [key, value] of Object.entries(state.playLogData)) {
                playLog[key] = value;
            }
        }
        // Combo graph: load the graph for the imported combo.
        if (typeof window.comboGraphRefresh === 'function') window.comboGraphRefresh();
    }

    // Check if inpput state is JSON or string of JSON data
    // Currently supports: JSON or Object
    // Returns state object
    checkStateType(state) {
        if (typeof state == 'string') {
            state = JSON.parse(state);
        }
        return state;
    }

    checkData(state) {
        var board = this;
        var data = state;
        var checkStatus = true;
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        if (!('items' in data)) {
            checkStatus = false;
            throw new Error('Wrong input. No Items set');
        }

        var items = { ...data.items };
        if (!Array.isArray(items)) {
            if (typeof items == 'object') {
                items = Object.values(items);
            }
        }

        if (Array.isArray(items)) {
            items.forEach(item => {
                if (!board.validateBeforeAddItem(item)) {
                    checkStatus = false;
                    throw new Error('Wrong item.' + JSON.stringify(item));
                }
            });
        } else {
            throw new Error('Data items must be an array')
        }
        return items;
    }
    parseDataFromState(state) {
        return state;
    }

}

function ygoUUID() {
    let d = new Date().getTime();//Timestamp
    let d2 = (performance && performance.now && (performance.now() * 1000)) || 0; //Time in microseconds since page-load or 0 if unsupported
    return 'xyxy-xxyy-0510-xyyy-xxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16; //random number between 0 and 16
        if (d > 0) { //Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {  //Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function parseDataFromOther(data) {
    var cards = [];
    var input = { ...data };
    if (typeof data == 'object' && 'mainDeck' in data && 'extraDeck' in data) {
        function mapkey(card) {
            if ((! 'cardId' in card) && ('id' in card)) {
                card.cardId = card.id;
            }
            var maps = {
                image: 'imageURL',
                id: 'orgID',
                // 'orgID' : 'id'
                // isHandTrap: isST,
            };
            $.each(maps, function (key, newKey) {
                card[newKey] = card[key];
                delete (card[key]);
            });
            card.uuid = ygoUUID();
            switch (card.type) {
                case "Link Monster":
                case "Fusion Monster":
                case "Synchro Monster":
                case "XYZ Monster":
                case "Pendulum Monster":
                case "Synchro Pendulum Monster":
                case "XYZ Pendulum Effect Monster":
                case "Synchro Pendulum Effect Monster":
                case "Synchro Tuner Monster":
                case "Synchro Pendulum Monster":
                case "Synchro Pendulum Monster":
                    card.isMonster = true;
                    card.isST = false;
                    card.isSpell = false;
                    card.isTrap = false;

                    break;
                case "Spell Card":
                    card.isMonster = false;
                    card.isST = true;
                    card.isSpell = true;
                    card.isTrap = false;

                    break;
                case "Trap Card":
                    card.isMonster = false;
                    card.isST = true;
                    card.isSpell = false;
                    card.isTrap = true;

                    break;
                case "Effect Monster":
                case "Normal Monster":
                case "Tuner Monster":
                case "Ritual Effect Monster":
                case "Flip Effect Monster":
                case "Pendulum Normal Monster":
                case "Pendulum Effect Monster":
                case "Pendulum Effect Ritual Monster":
                case "Toon Monster":
                case "Normal Tuner Monster":
                case "Ritual Monster":
                case "Pendulum Effect Fusion Monster":
                case "Union Effect Monster":
                case "Pendulum Tuner Effect Monster":
                case "Gemini Monster":
                case "Pendulum Flip Effect Monster":
                case "Spirit Monster":
                    card.isMonster = true;
                    card.isST = false;
                    card.isSpell = false;
                    card.isTrap = false;
                    break;
                default:
                    card.isMonster = false;
                    card.isST = false;
                    card.isSpell = false;
                    card.isTrap = false;

                    break;
            }
            return card;
        }
        $.each(input.mainDeck, function (index, card) {
            card = mapkey(card);
            card.isExtra = false;
            cards.push(card);
        });
        $.each(input.extraDeck, function (index, card) {

            card.isExtra = true;
            card.position = 'exdeck'; //if isExtra card then draw it in the extra deck
            card = mapkey(card);
            cards.push(card);

        });
    }

    return cards;
}
function wv_showError(msg) {
    alert(msg);
}

$(document).ready(function () {
    const isDebug = urlParams.get('debug');

    // --- Load a saved board state from the local board.json file ---------------
    // board.json is a full board export (items + playLogData) produced by
    // board.exportState(). We restore it with importState(), which also brings
    // back the recorded combo (so it can be replayed and shown in the combo
    // graph). importState() itself triggers the combo-graph refresh.
    $.getJSON('board.json', function (state) {
        board = new Board($('#playtest'), state.items, {
            isDebug: isDebug,
            skill: (state.skill && state.skill.name) || "",
        });
        board.importState(state);
        // Show a random visible card in the info panel right away.
        board.showRandomCardInfo();
    }).fail(function () {
        wv_showError('Get board.json data failed');
    });

    // --- Original: load the sample deck from the live API ----------------------
    // Kept on purpose. If you'd rather fetch the deck from the API than load the
    // local board.json above, comment out the board.json loader and un-comment
    // this block instead.
    /*
    var jsonUrl = 'https://ygovietnamcdn.azureedge.net/storage/Assets/sample-simulator-deck.json';
    // jsonUrl = '0';
    $.getJSON(jsonUrl, function (data) {
        // Biến data chứa dữ liệu JSON được trả về từ URL
        // Bạn có thể làm gì đó với dữ liệu này ở đây
        const json = data;
        var data = parseDataFromOther(json);
        if (!data) {
            wv_showError('Wrong data');
        }
        board = new Board($('#playtest'), data, {
            isDebug: isDebug,
            skill: json.skill || "",
        });
        // Combo graph: load the graph alongside the board JSON.
        if (typeof window.comboGraphRefresh === 'function') window.comboGraphRefresh();
    }).fail(function () {
        wv_showError('Get JSON data failed');

    }).done(function () {
        console.log(board);

    })
    */

    var playBoard = $('#playtest');
    var logMessage = $('#log-message');
    var lcardinformations = $('.lcard-informations');

    if (playBoard.length && logMessage.length) {
        setTimeout(function () {
            setLogHeight();
        }, 50);
    }
    logHeightTimeOut = 0;
    function setLogHeight() {
        var elms = logMessage.parent().siblings();
        var m_height = 0;
        var padding = parseInt(logMessage.css('paddingTop')) + parseInt(logMessage.css('paddingBottom')) + parseInt(logMessage.css('borderTopWidth')) + parseInt(logMessage.css('borderBottomWidth'));

        elms.length && elms.each(function () {
            if (!['fixed', 'absolute'].includes($(this).css('position'))) {
                m_height += parseInt($(this).outerHeight(true));
            }
        });
        logMessage.height(parseInt(playBoard.outerHeight()) - m_height - padding);
        if (lcardinformations.length) {
            lcardinformations.height(playBoard.outerHeight(true) - 10);
            var descriptonsHeight = playBoard.height() - lcardinformations.find('.lcard-header').outerHeight(true);
            lcardinformations.find('.lcard-descriptons').css({
                height: descriptonsHeight,
                maxHeight: descriptonsHeight
            });
        }
    }
    $(window).on('resize', function () {
        clearTimeout(logHeightTimeOut);
        logHeightTimeOut = setTimeout(setLogHeight, 200);
    });

});