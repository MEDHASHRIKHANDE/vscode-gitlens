'use strict';
import { intersectionWith } from 'lodash-es';
import { ProgressLocation, QuickInputButton, QuickInputButtons, QuickPickItem, window } from 'vscode';
import { Container } from '../../container';
import { GitBranch, GitTag, Repository } from '../../git/gitService';
import { GlyphChars } from '../../constants';
import { QuickCommandBase, QuickPickStep } from './quickCommand';
import { RepositoryQuickPickItem } from '../../quickpicks';
import { Strings } from '../../system';

interface State {
    repos: Repository[];
    ref: string;
}

export class CheckoutQuickCommand extends QuickCommandBase {
    constructor() {
        super('checkout', 'Checkout');
    }

    async execute(state: State) {
        return void (await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: `Checking out ${
                    state.repos.length === 1 ? state.repos[0].formattedName : `${state.repos.length} repositories`
                } to ${state.ref}`
            },
            () => Promise.all(state.repos.map(r => r.checkout(state.ref, { progress: false })))
        ));
    }

    async *steps(): AsyncIterableIterator<QuickPickStep> {
        const state: Partial<State> & { counter: number } = { counter: 0 };

        let showBranches = true;
        const branchesButton: QuickInputButton = {
            iconPath: {
                dark: Container.context.asAbsolutePath('images/dark/icon-branch.svg') as any,
                light: Container.context.asAbsolutePath('images/light/icon-branch.svg') as any
            },
            tooltip: 'Show Branches'
        };
        const getBranchRefs = async (repos: Repository[]) => {
            const branches = await Promise.all(repos.map(r => r.getBranches()));
            return intersectionWith(...branches, ((b1: GitBranch, b2: GitBranch) => b1.name === b2.name) as any).map<
                QuickPickItem
            >(b => ({ label: b.name }));
        };

        const tagsButton: QuickInputButton = {
            iconPath: {
                dark: Container.context.asAbsolutePath('images/dark/icon-tag.svg') as any,
                light: Container.context.asAbsolutePath('images/light/icon-tag.svg') as any
            },
            tooltip: 'Show Tags'
        };
        const getTagRefs = async (repos: Repository[]) => {
            const tags = await Promise.all(repos.map(r => r.getTags()));
            return intersectionWith(...tags, ((t1: GitTag, t2: GitTag) => t1.name === t2.name) as any).map<
                QuickPickItem
            >(t => ({ label: t.name }));
        };

        while (true) {
            if (state.repos === undefined || state.counter < 1) {
                const repos = [...(await Container.git.getOrderedRepositories())];

                const step = this.createStep<RepositoryQuickPickItem>({
                    multiselect: true,
                    title: this.title,
                    placeholder: 'Choose repositories',
                    items: repos.map(
                        repo =>
                            new RepositoryQuickPickItem(
                                repo,
                                state.repos ? state.repos.some(r => r.id === repo.id) : undefined
                            )
                    )
                });
                const selection = yield step;

                if (!this.canMoveNext(step, state, selection)) {
                    break;
                }

                state.repos = selection.map(i => i.repository);
            }

            if (state.ref === undefined || state.counter < 2) {
                let branchRefs: QuickPickItem[] | undefined;
                let tagRefs: QuickPickItem[] | undefined;
                if (showBranches) {
                    branchRefs = await getBranchRefs(state.repos);
                }
                else {
                    tagRefs = await getTagRefs(state.repos);
                }

                const items = showBranches ? branchRefs! : tagRefs!;
                const step = this.createStep<QuickPickItem>({
                    title: `${this.title}${Strings.pad(GlyphChars.Dot, 2, 2)}${
                        state.repos.length === 1 ? state.repos[0].formattedName : `${state.repos.length} repositories`
                    }`,
                    placeholder: `Choose a ${showBranches ? 'branch' : 'tag'} to checkout to`,
                    items: items,
                    selectedItems: state.ref ? items.filter(ref => ref.label === state.ref) : undefined,
                    buttons: [QuickInputButtons.Back, showBranches ? tagsButton : branchesButton],
                    // eslint-disable-next-line no-loop-func
                    onDidClickButton: async (quickpick, button) => {
                        quickpick.busy = true;
                        quickpick.enabled = false;

                        if (button === branchesButton) {
                            showBranches = true;
                        }
                        else if (button === tagsButton) {
                            showBranches = false;
                        }

                        quickpick.placeholder = `Choose a ${showBranches ? 'branch' : 'tag'} to checkout to`;
                        quickpick.buttons = [QuickInputButtons.Back, showBranches ? tagsButton : branchesButton];

                        if (showBranches && branchRefs === undefined) {
                            branchRefs = await getBranchRefs(state.repos!);
                        }
                        else if (!showBranches && tagRefs === undefined) {
                            tagRefs = await getTagRefs(state.repos!);
                        }

                        quickpick.items = showBranches ? branchRefs! : tagRefs!;

                        quickpick.busy = false;
                        quickpick.enabled = true;
                    }
                });
                const selection = yield step;

                if (!this.canMoveNext(step, state, selection)) {
                    continue;
                }

                state.ref = selection[0].label;
            }

            this.execute(state as State);
            break;
        }
    }
}
