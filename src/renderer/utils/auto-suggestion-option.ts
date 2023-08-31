/**
 * The data for an autosuggestion option.
 *
 * @interface AutoSuggestionOption
 * @member {string} suggestion the user facing suggestion.
 * @member {string} description optionally gives the user more information about the suggestion.
 * @member {string} replaceSuggestion optionally replace the user facing suggestion with this value when a user selects the suggestion.
 *
 */
export default interface AutoSuggestionOption {
    suggestion: string;
    description?: string;
    replaceSuggestion?: string;
}
