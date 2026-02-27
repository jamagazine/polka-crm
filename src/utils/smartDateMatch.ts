export function smartDateMatch(dateString: string, query: string): boolean {
    if (!query) return true;
    if (!dateString) return false;

    const processedQuery = query.toLowerCase().trim();
    const months: Record<string, string> = {
        'янв': '.01.',
        'фев': '.02.',
        'мар': '.03.',
        'апр': '.04.',
        'май': '.05.',
        'июн': '.06.',
        'июл': '.07.',
        'авг': '.08.',
        'сен': '.09.',
        'окт': '.10.',
        'ноя': '.11.',
        'дек': '.12.',
    };

    let finalQuery = processedQuery;
    for (const [key, value] of Object.entries(months)) {
        if (processedQuery.includes(key)) {
            // Replace the text (e.g. "фев" or "февраля") with the numeric month.
            // A simple replace regex matching the key and any trailing letters.
            finalQuery = processedQuery.replace(new RegExp(key + '[а-я]*', 'g'), value);
            // If the user typed "15 фев", we now have "15 .02." Let's trim inner spaces around dots.
            finalQuery = finalQuery.replace(/\s*\.\s*/g, '.');
            break;
        }
    }

    return dateString.includes(finalQuery);
}
