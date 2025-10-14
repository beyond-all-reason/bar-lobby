// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { UserId } from "tachyon-protocol/types";
import { Signal } from "$/jaz-ts-utils/signal";

export class SubsManager {
    public readonly onUsersAttached: Signal<UserId[]> = new Signal();
    public readonly onUsersDetached: Signal<UserId[]> = new Signal();

    private userList: Map<UserId, Set<symbol>>;
    constructor() {
        this.userList = new Map<UserId, Set<symbol>>();
    }
    /**
     * Attach the UserId(s) to the selected subscription list. A subscription request will be automatically sent to the Tachyon server if required.
     * @param users UserId, or Array of UserId, that will be attached
     * @param list Symbol indicating which subscription list to attach them to.
     */
    attach(users: UserId, list: symbol): void;
    attach(users: UserId[], list: symbol): void;
    attach(users: UserId | UserId[], list: symbol): void {
        const userSubs: UserId[] = [];
        for (const user of typeof users === "string" ? [users] : users) {
            //for every userId we will...
            let dirty: boolean = false;
            let uLists = this.userList.get(user); //get the lists for the user
            if (!uLists) {
                //if undefined, there are none for this user
                uLists = new Set(); //so we create an empty Set for this user
                uLists.add(list); //we add the requested list to this set
                userSubs.push(user); //add the user to the subscription list because they are entirely new
                dirty = true;
            }
            if (!uLists.has(list)) {
                //if this list is missing from this user
                uLists.add(list); //we add it!
                dirty = true;
            }
            if (dirty) {
                this.userList.set(user, uLists); //update the user's map with the changes
            }
        }
        if (userSubs.length > 0) {
            this.onUsersAttached.dispatch(userSubs);
        }
    }

    /**
     * Detach the UserId(s) from the selected subscription list. An unsubscribe request will be automatically sent to the Tachyon Server if required.
     * @param users UserId, or Array of UserId, that will be detached
     * @param list Symbol indicating which subscription list to detach them from
     */
    detach(users: UserId, list: symbol): void;
    detach(users: UserId[], list: symbol): void;
    detach(users: UserId | UserId[], list: symbol): void {
        const userUnsubs: UserId[] = [];
        for (const user of typeof users === "string" ? [users] : users) {
            let dirty: boolean = false;
            const uLists = this.userList.get(user); //get the current users lists
            if (uLists) {
                //if it's not undefined
                dirty = uLists.delete(list); //we delete the requested list
                if (dirty) {
                    //if a list was deleted successfully
                    if (uLists.size == 0) {
                        //we check if there are any lists left
                        userUnsubs.push(user); //and add them to unsub if there are none
                        this.userList.delete(user); //also delete from the list of subscribed users
                    } else {
                        //there are lists remaining
                        this.userList.set(user, uLists); //save the updated set to the user's map
                    }
                }
            }
        }
        if (userUnsubs.length > 0) {
            this.onUsersDetached.dispatch(userUnsubs);
        }
    }

    /**
     * Provides all UserId(s) currently part of the subscription list.
     * @param list Symbol indicating which subscription list to get the UserIds for.
     * @returns An Array of UserId, or an empty Array if the list has none.
     */
    getUsersInSubList(list: symbol): UserId[] {
        const arr: UserId[] = [];
        for (const [key, value] of this.userList.entries()) {
            if (value.has(list)) {
                arr.push(key);
            }
        }
        return arr;
    }

    /**
     * Provides all Sublists the identified UserId(s) are currently attached to.
     * @param users UserId, or Array of UserId
     * @returns An Array of Symbols, or an empty Array if the UserId(s) are in none of the lists.
     */
    getSubListsFromUsers(users: UserId): symbol[];
    getSubListsFromUsers(users: UserId[]): symbol[];
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
     * Provides all UserIds currently in any subscription list
     * @returns An Array of UserIds, or an empty Array if there no subscriptions
     */
    getAllUsersSubscribed(): UserId[] {
        const arr: UserId[] = [];
        for (const [key] of this.userList.entries()) {
            arr.push(key);
        }
        return arr;
    }

    /**
     * Removes all users from a specific subscription list.
     * @param list Symbol for the relevant subscription list
     */
    clearAllFromList(list: symbol): void {
        const userUnsubs: UserId[] = [];
        for (const [key, value] of this.userList.entries()) {
            //for each user
            const mySet: Set<symbol> = value; //get their set of symbols
            let dirty: boolean = false;
            dirty = mySet.delete(list); //try to delete the list, and save true/false to dirty
            if (dirty) {
                //deletion was successful, so the list is dirty
                if (mySet.size > 0) {
                    // we have list entries left
                    this.userList.set(key, mySet); //save the now-reduced set to the user again
                } else {
                    //we have zero entries left, so unsub and delete
                    userUnsubs.push(key); //and add them to unsub if there are none
                    this.userList.delete(key); //also delete from the list of subscribed users
                }
            }
        }
        if (userUnsubs.length > 0) {
            this.onUsersDetached.dispatch(userUnsubs);
        }
    }

    /**
     * Replace a subscription list with an entirely new one, and subscribe/unsubscribe as appropriate
     * @param list Symbol for the relevant subscription list
     * @param users UserId, or Array of UserId, that will replace the current list
     */
    setList(users: UserId, list: symbol): void;
    setList(users: UserId[], list: symbol): void;
    setList(users: UserId | UserId[], list: symbol): void {
        const currentSet: Set<UserId> = new Set(this.getUsersInSubList(list));
        const usersSet: Set<UserId> = new Set(users);
        let freshSet: Set<UserId> = new Set();
        let staleSet: Set<UserId> = new Set();
        const userSubs: UserId[] = [];
        const userUnsubs: UserId[] = [];

        freshSet = usersSet.difference(currentSet);
        staleSet = currentSet.difference(usersSet);

        for (const user of freshSet.values()) {
            const mySet: Set<symbol> | undefined = this.userList.get(user);
            if (mySet != undefined) {
                mySet.add(list);
                this.userList.set(user, mySet);
            } else {
                const mySet: Set<symbol> = new Set();
                mySet.add(list);
                this.userList.set(user, mySet);
            }
            userSubs.push(user);
        }
        for (const user of staleSet.values()) {
            const mySet: Set<symbol> | undefined = this.userList.get(user);
            if (mySet != undefined) {
                mySet.delete(list);
                if (mySet.size == 0) {
                    userUnsubs.push(user);
                    this.userList.delete(user);
                } else {
                    this.userList.set(user, mySet);
                }
            }
        }
        if (userSubs.length > 0) {
            this.onUsersAttached.dispatch(userSubs);
        }
        if (userUnsubs.length > 0) {
            this.onUsersDetached.dispatch(userUnsubs);
        }
    }
}
