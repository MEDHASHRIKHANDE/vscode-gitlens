'use strict';
import { QuickInputButton, QuickPick, QuickPickItem } from 'vscode';

export interface QuickPickStep<T extends QuickPickItem = any> {
    buttons?: QuickInputButton[];
    selectedItems?: QuickPickItem[];
    items: QuickPickItem[];
    multiselect?: boolean;
    placeholder?: string;
    title?: string;

    onDidClickButton?(quickpick: QuickPick<T>, button: QuickInputButton): void;
    validate?(selection: T[]): boolean;
}

export class CommandAbortError extends Error {
    constructor() {
        super('Abort');
    }
}

export abstract class QuickCommandBase implements QuickPickItem {
    static is(item: QuickPickItem): item is QuickCommandBase {
        return item instanceof QuickCommandBase;
    }

    readonly description?: string;
    readonly detail?: string;

    private _current: QuickPickStep | undefined;
    private _stepsIterator: AsyncIterableIterator<QuickPickStep> | undefined;

    constructor(
        public readonly label: string,
        public readonly title: string,
        options: {
            description?: string;
            detail?: string;
        } = {}
    ) {
        this.description = options.description;
        this.detail = options.detail;
    }

    abstract steps(): AsyncIterableIterator<QuickPickStep>;

    async previous(): Promise<QuickPickStep | undefined> {
        // Simulate going back, by having no selection
        return (await this.next([])).value;
    }

    async next(selection?: QuickPickItem[]): Promise<IteratorResult<QuickPickStep>> {
        if (this._stepsIterator === undefined) {
            this._stepsIterator = this.steps();
        }

        const result = await this._stepsIterator.next(selection);
        this._current = result.value;

        if (result.done) {
            this._stepsIterator = undefined;
        }

        return result;
    }

    get value(): QuickPickStep | undefined {
        return this._current;
    }

    protected createConfirmStep(title: string, confirmation: string, suffix?: string): QuickPickStep<QuickPickItem> {
        return this.createStep<QuickPickItem>({
            placeholder: `Confirm ${this.title}`,
            title: title,
            items: [{ label: this.title, description: confirmation }, { label: 'Cancel' }],
            // eslint-disable-next-line no-loop-func
            validate: (selection: QuickPickItem[]) => {
                if (selection[0].label === 'Cancel') throw new CommandAbortError();
                return true;
            }
        });
    }

    protected createStep<T extends QuickPickItem>(step: QuickPickStep<T>): QuickPickStep<T> {
        return step;
    }

    protected canMoveNext<T extends QuickPickItem>(
        step: QuickPickStep<T>,
        state: { counter: number },
        selection: T[] | undefined
    ): selection is T[] {
        if (selection === undefined || selection.length === 0) {
            state.counter--;
            return false;
        }

        if (step.validate === undefined || step.validate(selection)) {
            state.counter++;
            return true;
        }

        return false;
    }
}
