// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UserId } from "tachyon-protocol/types";
import { Signal } from "$/jaz-ts-utils/signal";

export class SubsManager {
    public readonly onNewUsersAttached: Signal<UserId[]> = new Signal();
    public readonly onOldUsersDetached: Signal<UserId[]> = new Signal();
    private userList: Map<UserId, Set<symbol>> = new Map<UserId, Set<symbol>>();

    /**
     * Attach the UserId(s) to the selected subscription list. An onNewUsersAttached Signal will be dispatched if needed.
     * @param users UserId, or Array of UserId, that will be attached
     * @param list Symbol indicating which subscription list to attach them to.
     */
    attach(users: UserId | UserId[], list: symbol): void {
        const userSubs: UserId[] = [];
        for (const user of typeof users === "string" ? [users] : users) {
            let uLists: Set<symbol> | undefined = this.userList.get(user);
            if (uLists == undefined) {
                uLists = new Set();
                this.userList.set(user, uLists);
                userSubs.push(user);
            }
            uLists.add(list);
        }
        if (userSubs.length > 0) {
            this.onNewUsersAttached.dispatch(userSubs);
        }
    }

    /**
     * Detach the UserId(s) from the selected subscription list. An onOldUsersDetached Signal will be dispatched if needed.
     * @param users UserId, or Array of UserId, that will be detached
     * @param list Symbol indicating which subscription list to detach them from
     */
    detach(users: UserId | UserId[], list: symbol): void {
        const userUnsubs: UserId[] = [];
        for (const user of typeof users === "string" ? [users] : users) {
            const uLists: Set<symbol> | undefined = this.userList.get(user);
            if (uLists?.delete(list) && uLists.size === 0) {
                userUnsubs.push(user);
                this.userList.delete(user);
            }
        }
        if (userUnsubs.length > 0) {
            this.onOldUsersDetached.dispatch(userUnsubs);
        }
    }

    /**
     * Provides all UserId(s) currently part of the subscription list.
     * @param list Symbol indicating which subscription list to get the UserIds for.
     * @returns An Array of UserId, or an empty Array if the list has none.
     */
    getUsersInSubList(list: symbol): UserId[] {
        const arr: UserId[] = [];
        for (const [userKey, uLists] of this.userList.entries()) {
            if (uLists.has(list)) {
                arr.push(userKey);
            }
        }
        return arr;
    }

    /**
     * Provides all Sublists the identified UserId(s) are currently attached to.
     * @param users UserId, or Array of UserId
     * @returns An Array of Symbols, or an empty Array if the UserId(s) are in none of the lists.
     */
    getSubListsFromUsers(users: UserId | UserId[]): symbol[] {
        let mySet: Set<symbol> = new Set();
        for (const user of typeof users === "string" ? [users] : users) {
            const userSymbols = this.userList.get(user);
            if (userSymbols != undefined) {
                mySet = mySet.union(userSymbols);
            }
        }
        return Array.from(mySet);
    }

    /**
     * Provides all UserIds currently in any subscription list.
     * @returns An Array of UserIds, or an empty Array if there no subscriptions
     */
    getAllUsersSubscribed(): UserId[] {
        return Array.from(this.userList.keys());
    }

    /**
     * Removes all users from a specific subscription list. An onOldUsersDetached Signal will be dispatched if needed.
     * @param list Symbol for the relevant subscription list
     */
    clearAllFromList(list: symbol): void {
        this.detach(this.getAllUsersSubscribed(), list);
    }

    /**
     * Replace a subscription list with an entirely new one as provided. An onNewUsersAttached or onOldUsersDetached Signal will be dispatched if needed.
     * @param list Symbol for the relevant subscription list
     * @param users UserId, or Array of UserId, that will replace the current list
     */
    setList(users: UserId | UserId[], list: symbol): void {
        const currentSet: Set<UserId> = new Set(this.getUsersInSubList(list));
        const usersSet: Set<UserId> = new Set(users);
        const freshSet: Set<UserId> = usersSet.difference(currentSet);
        const staleSet: Set<UserId> = currentSet.difference(usersSet);
        this.attach([...freshSet], list);
        this.detach([...staleSet], list);
    }
}
