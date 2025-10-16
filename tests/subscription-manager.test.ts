// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { expect, test } from "vitest";
import { SubsManager } from "@renderer/utils/subscriptions-manager";

const symb1 = Symbol();
const symb2 = Symbol();
const symb3 = Symbol();

test("check attach single new user", () => {
    const subsManager = new SubsManager();
    const users: string = "123";
    subsManager.onNewUsersAttached.add((users) => {
        expect(users).toStrictEqual(["123"]);
    });
    subsManager.attach(users, symb1);
});

test("check attach multiple new users", () => {
    const subsManager = new SubsManager();
    const users: string[] = ["123", "456"];
    subsManager.onNewUsersAttached.add((users) => {
        expect(users).toStrictEqual(["123", "456"]);
    });
    subsManager.attach(users, symb1);
});

test("check detach single user fully detached", () => {
    const subsManager = new SubsManager();
    const user: string = "123";
    const users: string[] = ["123", "456", "789"];
    subsManager.onOldUsersDetached.add((users) => {
        expect(users).toStrictEqual(["123"]);
    });
    subsManager.attach(users, symb1);
    subsManager.detach(user, symb1);
    expect(subsManager.getAllUsersSubscribed()).toStrictEqual(["456", "789"]);
});

test("check detach multiple users fully detached", () => {
    const subsManager = new SubsManager();
    const startUsers: string[] = ["123", "456", "789"];
    const usersToDetach: string[] = ["123", "456"];
    subsManager.onOldUsersDetached.add((users) => {
        expect(users).toStrictEqual(["123", "456"]);
    });
    subsManager.attach(startUsers, symb1);
    subsManager.detach(usersToDetach, symb1);
    expect(subsManager.getAllUsersSubscribed()).toStrictEqual(["789"]);
});

test("check populated getUsersInSubList", () => {
    const subsManager = new SubsManager();
    const startUsers: string[] = ["123", "456", "789"];
    subsManager.attach(startUsers, symb1);
    expect(subsManager.getUsersInSubList(symb1)).toStrictEqual(["123", "456", "789"]);
});

test("check empty getUsersInSubList", () => {
    const subsManager = new SubsManager();
    const startUsers: string[] = ["123", "456", "789"];
    subsManager.attach(startUsers, symb1);
    subsManager.detach(startUsers, symb1);
    expect(subsManager.getUsersInSubList(symb1)).toStrictEqual([]);
});

test("check modified getUsersInSubList", () => {
    const subsManager = new SubsManager();
    const startUsers: string[] = ["123", "456", "789"];
    const dropUser: string = "456";
    subsManager.attach(startUsers, symb1);
    subsManager.detach(dropUser, symb1);
    expect(subsManager.getUsersInSubList(symb1)).toStrictEqual(["123", "789"]);
});

test("check single-user getSubListsFromUsers", () => {
    const subsManager = new SubsManager();
    const user1: string = "123";
    const user2: string = "456";
    const user3: string = "789";
    subsManager.attach([user1, user2, user3], symb1);
    subsManager.attach(user1, symb2);
    expect(subsManager.getSubListsFromUsers(user1)).toStrictEqual([symb1, symb2]);
});

test("check multi-user getSubListsFromUsers", () => {
    const subsManager = new SubsManager();
    const user1: string = "123";
    const user2: string = "456";
    const user3: string = "789";
    subsManager.attach([user1, user2, user3], symb1);
    subsManager.attach([user1, user2], symb2);
    subsManager.attach([user2], symb3);
    expect(subsManager.getSubListsFromUsers([user1, user2])).toStrictEqual([symb1, symb2, symb3]);
});

test("check getAllUsersSubscribed", () => {
    const subsManager = new SubsManager();
    const user1: string = "123";
    const user2: string = "456";
    const user3: string = "789";
    subsManager.attach([user1, user2], symb1);
    subsManager.attach([user3], symb2);
    expect(subsManager.getAllUsersSubscribed()).toStrictEqual(["123", "456", "789"]);
});

test("check clearAllFromList", () => {
    const subsManager = new SubsManager();
    subsManager.onOldUsersDetached.add((users) => {
        expect(users).toStrictEqual(["123", "456"]);
    });
    const user1: string = "123";
    const user2: string = "456";
    const user3: string = "789";
    subsManager.attach([user1, user2], symb1);
    subsManager.attach([user3], symb2);
    subsManager.clearAllFromList(symb1);
    expect(subsManager.getAllUsersSubscribed()).toStrictEqual(["789"]);
});

test("check multi-user setList", () => {
    const subsManager = new SubsManager();
    subsManager.onNewUsersAttached.add((users) => {
        expect(users).toStrictEqual(["123", "456", "789"]);
    });
    const startUsers: string[] = ["123", "456", "789"];
    subsManager.setList(startUsers, symb1);
    expect(subsManager.getUsersInSubList(symb1)).toStrictEqual(["123", "456", "789"]);
});
