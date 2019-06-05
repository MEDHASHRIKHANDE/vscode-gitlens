'use strict';
import { window } from 'vscode';
import { Container } from '../container';
import { Iterables } from '../system';
import { CommandQuickPickItem, getQuickPickIgnoreFocusOut } from './commonQuickPicks';
import { RepositoryQuickPickItem } from './gitQuickPicks';

export class RepositoriesQuickPick {
    static async show(
        placeHolder: string,
        goBackCommand?: CommandQuickPickItem
    ): Promise<RepositoryQuickPickItem | CommandQuickPickItem | undefined> {
        const items = [
            ...Iterables.map(await Container.git.getOrderedRepositories(), r => new RepositoryQuickPickItem(r))
        ] as (RepositoryQuickPickItem | CommandQuickPickItem)[];

        if (goBackCommand !== undefined) {
            items.splice(0, 0, goBackCommand);
        }

        // const scope = await Container.keyboard.beginScope({ left: goBackCommand });

        const pick = await window.showQuickPick(items, {
            placeHolder: placeHolder,
            ignoreFocusOut: getQuickPickIgnoreFocusOut()
        });

        // await scope.dispose();

        return pick;
    }
}
