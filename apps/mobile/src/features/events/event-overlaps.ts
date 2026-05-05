export type EventOverlapCandidate = {
    endAt: string;
    id: string;
    name: string;
    startAt: string;
};

const parseTime = (value: string): number => new Date(value).getTime();

const isValidInterval = (event: EventOverlapCandidate): boolean => {
    const startTime = parseTime(event.startAt);
    const endTime = parseTime(event.endAt);

    return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime < endTime;
};

const overlaps = (left: EventOverlapCandidate, right: EventOverlapCandidate): boolean => {
    const leftStart = parseTime(left.startAt);
    const leftEnd = parseTime(left.endAt);
    const rightStart = parseTime(right.startAt);
    const rightEnd = parseTime(right.endAt);

    return leftStart < rightEnd && rightStart < leftEnd;
};

export const findOverlappingEvents = (
    events: readonly EventOverlapCandidate[]
): EventOverlapCandidate[] => {
    const validEvents = events.filter(isValidInterval);
    const overlappingEventIds = new Set<string>();

    validEvents.forEach((event, eventIndex) => {
        validEvents.slice(eventIndex + 1).forEach((candidate) => {
            if (!overlaps(event, candidate)) {
                return;
            }

            overlappingEventIds.add(event.id);
            overlappingEventIds.add(candidate.id);
        });
    });

    return validEvents.filter((event) => overlappingEventIds.has(event.id));
};