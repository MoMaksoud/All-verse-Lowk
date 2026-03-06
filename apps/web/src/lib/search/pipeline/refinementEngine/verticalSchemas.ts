import type { SearchVertical } from "../../types";
import type { VerticalSchema } from "./types";

const COMMON_CONDITION_OPTIONS = ["new", "used", "Not sure"];

const AUTO_ENGINE_FAMILIES = [
    "Caterpillar C12",
    "Caterpillar C15",
    "Cummins ISX",
    "Detroit DD15",
    "Not sure",
];

const AUTO_MAKES = [
    "Toyota",
    "Honda",
    "Ford",
    "Chevrolet",
    "Nissan",
    "BMW",
    "Not sure",
];

const VERTICAL_SCHEMAS: Record<SearchVertical, VerticalSchema> = {
    auto_parts: {
        vertical: "auto_parts",
        keywords: [
            "cylinder head",
            "alternator",
            "radiator",
            "starter",
            "head gasket",
            "brake",
            "engine",
            "transmission",
            "turbo",
            "injector",
            "caterpillar",
            "cummins",
            "detroit",
        ],
        slots: [
            {
                field: "engine_model",
                question: "Which engine model/type does this part need to fit?",
                reason: "Fitment is the strongest precision signal for auto parts.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: AUTO_ENGINE_FAMILIES,
            },
            {
                field: "part_type",
                question: "What exact part type are you looking for?",
                reason: "Part type disambiguates broad automotive queries.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: ["cylinder head", "alternator", "starter", "radiator", "Not sure"],
            },
            {
                field: "make",
                question: "What vehicle or equipment make is this for?",
                reason: "Make narrows candidate compatibility quickly.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: AUTO_MAKES,
            },
            {
                field: "model",
                question: "What model is this for?",
                reason: "Model is key for compatibility.",
                priority: "mediumValue",
                optionGeneration: "result_entities",
            },
            {
                field: "year_range",
                question: "What year range should this fit?",
                reason: "Year is important for fitment-specific parts.",
                priority: "mediumValue",
                optionGeneration: "query_entities",
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition improves shopping relevance and price alignment.",
                priority: "lowValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
        ],
    },
    vehicles: {
        vertical: "vehicles",
        keywords: [
            "for sale",
            "mileage",
            "vin",
            "sedan",
            "truck",
            "suv",
            "motorcycle",
            "car",
            "vehicle",
        ],
        slots: [
            {
                field: "make",
                question: "What make are you looking for?",
                reason: "Vehicle make is the top-level disambiguator.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: AUTO_MAKES,
            },
            {
                field: "model",
                question: "Which model are you interested in?",
                reason: "Model gives precision for inventory matching.",
                priority: "highValue",
                optionGeneration: "result_entities",
            },
            {
                field: "year_range",
                question: "What year range do you want?",
                reason: "Year range improves relevance.",
                priority: "mediumValue",
                optionGeneration: "query_entities",
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition impacts both pricing and inventory quality.",
                priority: "lowValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
        ],
    },
    electronics: {
        vertical: "electronics",
        keywords: [
            "iphone",
            "macbook",
            "laptop",
            "gpu",
            "cpu",
            "monitor",
            "headphones",
            "camera",
            "tablet",
            "smartphone",
        ],
        slots: [
            {
                field: "brand",
                question: "Which brand do you prefer?",
                reason: "Brand is usually the main precision signal in electronics.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: ["Apple", "Samsung", "Sony", "Dell", "HP", "Asus", "Not sure"],
            },
            {
                field: "model",
                question: "Which model are you searching for?",
                reason: "Model narrows similarly named products.",
                priority: "highValue",
                optionGeneration: "result_entities",
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition affects price and warranty expectations.",
                priority: "mediumValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
            {
                field: "priceIntent",
                question: "What price tier are you aiming for?",
                reason: "Price intent helps ranking when product family is broad.",
                priority: "lowValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["cheap", "mid", "premium", "Not sure"],
            },
        ],
    },
    fashion: {
        vertical: "fashion",
        keywords: ["dress", "shirt", "sneakers", "jacket", "pants", "hoodie", "shoe", "bag"],
        slots: [
            {
                field: "brand",
                question: "Any specific brand you want?",
                reason: "Brand is often the key shopping intent signal for fashion.",
                priority: "highValue",
                optionGeneration: "mixed",
                taxonomyOptions: ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Not sure"],
            },
            {
                field: "size",
                question: "What size are you looking for?",
                reason: "Size is critical to reduce unusable results.",
                priority: "highValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["XS", "S", "M", "L", "XL", "Not sure"],
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition is often important for apparel marketplaces.",
                priority: "mediumValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
        ],
    },
    home: {
        vertical: "home",
        keywords: ["sofa", "table", "chair", "bed", "mattress", "lamp", "appliance", "kitchen"],
        slots: [
            {
                field: "category",
                question: "Which home category is this for?",
                reason: "Category narrows broad home queries.",
                priority: "highValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["furniture", "appliances", "decor", "kitchen", "Not sure"],
            },
            {
                field: "brand",
                question: "Any preferred brand?",
                reason: "Brand helps ranking and quality matching.",
                priority: "mediumValue",
                optionGeneration: "result_entities",
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition strongly impacts pricing and expectations.",
                priority: "mediumValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
        ],
    },
    sports: {
        vertical: "sports",
        keywords: ["bike", "bicycle", "golf", "tennis", "baseball", "basketball", "soccer", "fitness"],
        slots: [
            {
                field: "category",
                question: "What type of sports item are you looking for?",
                reason: "Sports queries are often broad without equipment type.",
                priority: "highValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["fitness", "cycling", "golf", "team sports", "Not sure"],
            },
            {
                field: "brand",
                question: "Do you have a preferred brand?",
                reason: "Brand improves result quality for many equipment types.",
                priority: "mediumValue",
                optionGeneration: "result_entities",
            },
            {
                field: "condition",
                question: "Do you want new or used?",
                reason: "Condition affects quality and price range expectations.",
                priority: "mediumValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: COMMON_CONDITION_OPTIONS,
            },
        ],
    },
    other: {
        vertical: "other",
        keywords: [],
        slots: [
            {
                field: "category",
                question: "Which category best matches what you need?",
                reason: "Category clarifies broad unknown queries.",
                priority: "highValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["electronics", "fashion", "home", "sports", "auto_parts", "Not sure"],
            },
            {
                field: "brand",
                question: "Any brand preference?",
                reason: "Brand can still reduce broad result sets.",
                priority: "mediumValue",
                optionGeneration: "result_entities",
            },
        ],
    },
    general: {
        vertical: "general",
        keywords: [],
        slots: [
            {
                field: "category",
                question: "What category are you searching in?",
                reason: "Category is the most useful first clarification for broad queries.",
                priority: "highValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["electronics", "fashion", "home", "sports", "auto_parts", "vehicles", "Not sure"],
            },
            {
                field: "brand",
                question: "Do you have a preferred brand?",
                reason: "Brand can significantly improve precision across categories.",
                priority: "mediumValue",
                optionGeneration: "result_entities",
            },
            {
                field: "priceIntent",
                question: "What price tier are you aiming for?",
                reason: "Price intent is a useful fallback for broad shopping queries.",
                priority: "lowValue",
                optionGeneration: "taxonomy",
                taxonomyOptions: ["cheap", "mid", "premium", "Not sure"],
            },
        ],
    },
};

export function getVerticalSchema(vertical: SearchVertical): VerticalSchema {
    return VERTICAL_SCHEMAS[vertical] ?? VERTICAL_SCHEMAS.general;
}

export function getAllVerticalSchemas(): VerticalSchema[] {
    return Object.values(VERTICAL_SCHEMAS);
}
