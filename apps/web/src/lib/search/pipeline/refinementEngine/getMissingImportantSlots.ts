import type {
    MissingImportantSlots,
    MissingSlot,
    SearchRefinementField,
    SearchState,
    SearchVertical,
} from "../../types";
import { getVerticalSchema } from "./verticalSchemas";

function readSlotValue(field: SearchRefinementField, state: SearchState): unknown {
    if (field === "brand") return state.brand;
    if (field === "model") return state.model ?? state.attributes?.model;
    if (field === "shoe_type") return state.attributes?.shoe_type ?? state.attributes?.dress_shoe_style;
    if (field === "category") return state.category;
    if (field === "condition") return state.condition;
    if (field === "priceIntent") return state.priceIntent;
    if (field === "intent") return state.intent;
    return state.attributes?.[field];
}

function isMissingValue(value: unknown): boolean {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") return value.trim().length === 0;
    return false;
}

export function getMissingImportantSlots(
    vertical: SearchVertical,
    state: SearchState
): MissingImportantSlots {
    const schema = getVerticalSchema(vertical);

    const highValue: MissingSlot[] = [];
    const mediumValue: MissingSlot[] = [];
    const lowValue: MissingSlot[] = [];

    for (const slot of schema.slots) {
        const value = readSlotValue(slot.field, state);
        if (!isMissingValue(value)) continue;

        const mapped: MissingSlot = {
            field: slot.field,
            reason: slot.reason,
            suggestedQuestion: slot.question,
        };

        if (slot.priority === "required" || slot.priority === "highValue") {
            highValue.push(mapped);
            continue;
        }

        if (slot.priority === "mediumValue") {
            mediumValue.push(mapped);
            continue;
        }

        lowValue.push(mapped);
    }

    return {
        vertical,
        highValue,
        mediumValue,
        lowValue,
    };
}
