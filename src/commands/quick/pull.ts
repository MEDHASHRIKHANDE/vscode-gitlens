'use strict';
import { Container } from '../../container';
import { Repository } from '../../git/gitService';
import { QuickCommandBase, QuickPickStep } from './quickCommand';
import { RepositoryQuickPickItem } from '../../quickpicks';

interface State {
    repos: Repository[];
}

export class PullQuickCommand extends QuickCommandBase {
    constructor() {
        super('pull', 'Pulll');
    }

    execute(state: State) {
        return Container.git.pullAll(state.repos);
    }

    async *steps(): AsyncIterableIterator<QuickPickStep> {
        const state: Partial<State> & { counter: number } = { counter: 0 };

        while (true) {
            if (state.repos === undefined || state.counter < 1) {
                const repos = [...(await Container.git.getOrderedRepositories())];

                const step = this.createStep<RepositoryQuickPickItem>({
                    multiselect: true,
                    title: this.title,
                    placeholder: 'Choose repositories',
                    items: repos.map(r => new RepositoryQuickPickItem(r))
                });
                const selection = yield step;

                if (!this.canMoveNext(step, state, selection)) {
                    break;
                }

                state.repos = selection.map(i => i.repository);
            }

            this.execute(state as State);
            break;
        }
    }
}
