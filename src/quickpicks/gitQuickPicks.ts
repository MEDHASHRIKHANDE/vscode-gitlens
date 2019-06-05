'use strict';
import { QuickPickItem } from 'vscode';
import { GlyphChars } from '../constants';
import { Strings } from '../system';
import {
    GitBranch,
    GitLogCommit,
    GitReference,
    GitService,
    GitStashCommit,
    GitTag,
    Repository
} from '../git/gitService';

export class BranchQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string | undefined;

    constructor(
        public readonly branch: GitBranch,
        showCheckmarks: boolean,
        checked?: boolean,
        public readonly picked?: boolean
    ) {
        checked = showCheckmarks && (checked || (checked === undefined && branch.current));
        this.label = `${
            checked ? `$(check)${GlyphChars.Space.repeat(2)}` : showCheckmarks ? GlyphChars.Space.repeat(6) : ''
        }${branch.name}`;
        this.description = branch.remote
            ? `${GlyphChars.Space.repeat(2)} remote branch`
            : branch.current
            ? 'current branch'
            : '';

        this.picked = picked === undefined ? branch.current : picked;
    }

    get current() {
        return this.branch.current;
    }

    get item() {
        return this.branch;
    }

    get ref() {
        return this.branch.name;
    }

    get remote() {
        return this.branch.remote;
    }
}

export class CommitQuickPickItem<T extends GitLogCommit = GitLogCommit> implements QuickPickItem {
    label: string;
    description: string;
    detail: string;

    constructor(public readonly commit: T, public readonly picked?: boolean) {
        const message = commit.getShortMessage();
        if (GitStashCommit.is(commit)) {
            this.label = message;
            this.description = '';
            this.detail = `${GlyphChars.Space} ${commit.stashName || commit.shortSha} ${Strings.pad(
                GlyphChars.Dot,
                1,
                1
            )} ${commit.formattedDate} ${Strings.pad(GlyphChars.Dot, 1, 1)} ${commit.getFormattedDiffStatus({
                compact: true
            })}`;
        }
        else {
            this.label = message;
            this.description = `${Strings.pad('$(git-commit)', 1, 1)} ${commit.shortSha}`;
            this.detail = `${GlyphChars.Space} ${commit.author}, ${commit.formattedDate}${
                commit.isFile
                    ? ''
                    : ` ${Strings.pad(GlyphChars.Dot, 1, 1)} ${commit.getFormattedDiffStatus({ compact: true })}`
            }`;
        }
    }
}

export class RefQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string | undefined;

    constructor(public readonly ref: string, checked?: boolean) {
        this.label = `${checked ? `$(check)${GlyphChars.Space}` : GlyphChars.Space.repeat(4)} ${GitService.shortenSha(
            ref
        )}`;
        this.description = '';
    }

    get current() {
        return false;
    }

    get item() {
        const ref: GitReference = { name: this.ref, ref: this.ref };
        return ref;
    }

    get remote() {
        return false;
    }
}

export class RepositoryQuickPickItem implements QuickPickItem {
    label: string;
    description: string;

    constructor(public readonly repository: Repository, public readonly picked?: boolean) {
        this.label = repository.name;
        this.description = repository.path;
    }

    get repoPath(): string {
        return this.repository.path;
    }
}

export class TagQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string | undefined;

    constructor(public readonly tag: GitTag, showCheckmarks: boolean, checked: boolean) {
        checked = showCheckmarks && checked;
        this.label = `${
            checked ? `$(check)${GlyphChars.Space.repeat(2)}` : showCheckmarks ? GlyphChars.Space.repeat(6) : ''
        }${tag.name}`;
        this.description = `${GlyphChars.Space.repeat(2)} tag`;
    }

    get current() {
        return false;
    }

    get item() {
        return this.tag;
    }

    get ref() {
        return this.tag.name;
    }

    get remote() {
        return false;
    }
}
