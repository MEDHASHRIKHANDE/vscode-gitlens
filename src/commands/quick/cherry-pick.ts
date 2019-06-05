'use strict';
import { Container } from '../../container';
import { GitBranch, GitLogCommit, Repository } from '../../git/gitService';
import { GlyphChars } from '../../constants';
import { Iterables, Strings } from '../../system';
import { CommandAbortError, QuickCommandBase, QuickPickStep } from './quickCommand';
import { BranchQuickPickItem, CommitQuickPickItem, RepositoryQuickPickItem } from '../../quickpicks';

interface State {
    repo: Repository;
    source: GitBranch;
    commits: GitLogCommit[];
    destination: GitBranch;
}

export class CherryPickQuickCommand extends QuickCommandBase {
    constructor() {
        super('cherry-pick', 'Cherry Pick');
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

                if (state.destination === undefined || state.counter < 2) {
                    const active = state.destination ? state.destination : branches.find(b => b.current)!;

                    const step = this.createStep<BranchQuickPickItem>({
                        title: `${this.title}${Strings.pad(GlyphChars.Dot, 2, 2)}${state.repo.name}`,
                        placeholder: 'Choose a branch to cherry-pick into',
                        items: branches.map(
                            b => new BranchQuickPickItem(b, false, undefined, b.ref === (active && active.ref))
                        )
                    });
                    const selection = yield step;

                    if (!this.canMoveNext(step, state, selection)) {
                        continue;
                    }

                    state.destination = selection[0].branch;
                }

                if (state.source === undefined || state.counter < 3) {
                    const step = this.createStep<BranchQuickPickItem>({
                        title: `${this.title} into ${state.destination.name}${Strings.pad(GlyphChars.Dot, 2, 2)}${
                            state.repo.name
                        }`,
                        placeholder: 'Choose a branch to cherry-pick from',
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

                if (state.commits === undefined || state.counter < 4) {
                    const log = await Container.git.getLog(state.source.repoPath, { ref: state.source.ref });

                    const step = this.createStep<CommitQuickPickItem>({
                        title: `${this.title} into ${state.destination.name}${Strings.pad(GlyphChars.Dot, 2, 2)}${
                            state.repo.name
                        }`,
                        multiselect: true,
                        placeholder: `Choose commits to cherry-pick into ${state.destination.name}`,
                        items: [
                            ...Iterables.map(
                                log!.commits.values(),
                                // eslint-disable-next-line no-loop-func
                                commit =>
                                    new CommitQuickPickItem(
                                        commit,
                                        state.commits ? state.commits.some(c => c.sha === commit.sha) : undefined
                                    )
                            )
                        ]
                    });
                    const selection = yield step;

                    if (!this.canMoveNext(step, state, selection)) {
                        continue;
                    }

                    state.commits = selection.map(i => i.commit);
                }

                const step = this.createConfirmStep(
                    `Confirm ${this.title}${Strings.pad(GlyphChars.Dot, 2, 2)}${state.repo.name}`,
                    `${Strings.pluralize('commit', state.commits.length)} into ${state.destination.name}`
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
