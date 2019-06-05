'use strict';
import { Container } from '../../container';
import { GitBranch, Repository } from '../../git/gitService';
import { GlyphChars } from '../../constants';
import { CommandAbortError, QuickCommandBase, QuickPickStep } from './quickCommand';
import { BranchQuickPickItem, RepositoryQuickPickItem } from '../../quickpicks';
import { Strings } from '../../system';

interface State {
    repo: Repository;
    destination: GitBranch;
    source: GitBranch;
}

export class MergeQuickCommand extends QuickCommandBase {
    constructor() {
        super('merge', 'Merge');
    }

    // eslint-disable-next-line require-await
    async execute(state: State) {
        console.log(state);
    }

    async *steps(): AsyncIterableIterator<QuickPickStep> {
        const state: Partial<State> & { counter: number } = { counter: 0 };

        while (true) {
            try {
                if (state.repo === undefined || state.counter < 1) {
                    const repos = [...(await Container.git.getOrderedRepositories())];

                    if (repos.length === 1) {
                        state.counter++;
                        state.repo = repos[0];
                    }
                    else {
                        const active = state.repo ? state.repo : await Container.git.getActiveRepository();

                        const step = this.createStep<RepositoryQuickPickItem>({
                            title: this.title,
                            placeholder: 'Choose a repository',
                            items: repos.map(r => new RepositoryQuickPickItem(r, r.id === (active && active.id)))
                        });
                        const selection = yield step;

                        if (!this.canMoveNext(step, state, selection)) {
                            break;
                        }

                        state.repo = selection[0].repository;
                    }
                }

                const branches = await state.repo.getBranches();
                state.destination = branches.find(b => b.current)!;

                if (state.source === undefined || state.counter < 2) {
                    const step = this.createStep<BranchQuickPickItem>({
                        title: `${this.title} into ${state.destination.name}${Strings.pad(GlyphChars.Dot, 2, 2)}${
                            state.repo.name
                        }`,
                        placeholder: `Choose a branch to merge into ${state.destination.name}`,
                        items: branches.map(
                            b =>
                                new BranchQuickPickItem(
                                    b,
                                    false,
                                    undefined,
                                    b.ref === (state.source && state.source.ref)
                                )
                        )
                    });
                    const selection = yield step;

                    if (!this.canMoveNext(step, state, selection)) {
                        continue;
                    }

                    state.source = selection[0].branch;
                }

                const step = this.createConfirmStep(
                    `Confirm ${this.title}${Strings.pad(GlyphChars.Dot, 2, 2)}${state.repo.name}`,
                    `${state.source.name} into ${state.destination.name}`
                );
                const selection = yield step;

                if (!this.canMoveNext(step, state, selection)) {
                    continue;
                }

                this.execute(state as State);
                break;
            }
            catch (ex) {
                if (ex instanceof CommandAbortError) break;

                throw ex;
            }
        }
    }
}
