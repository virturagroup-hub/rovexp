import {
  demoBadges,
  demoQuestCategories,
  demoPlaces,
  demoQuestCandidates,
  demoQuests,
  demoRewards,
  demoSponsors,
  demoStates,
  demoTitles,
} from "@rovexp/types";
import type {
  Badge,
  QuestCategory,
  QuestWithRelations,
  QuestCandidateWithRelations,
  PlaceWithRelations,
  Reward,
  SponsorBusiness,
  StateRecord,
  Title,
} from "@rovexp/types";

interface MockAdminStore {
  badges: Badge[];
  categories: QuestCategory[];
  places: PlaceWithRelations[];
  quests: QuestWithRelations[];
  questCandidates: QuestCandidateWithRelations[];
  rewards: Reward[];
  sponsors: SponsorBusiness[];
  states: StateRecord[];
  titles: Title[];
}

declare global {
  var __ROVEXP_ADMIN_STORE__: MockAdminStore | undefined;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toPlaceWithState(place: (typeof demoPlaces)[number]): PlaceWithRelations {
  return {
    ...place,
    state: demoStates.find((state) => state.id === place.state_id) ?? null,
  };
}

function toQuestCandidateWithRelations(
  candidate: (typeof demoQuestCandidates)[number],
): QuestCandidateWithRelations {
  const place = demoPlaces.find((item) => item.id === candidate.place_id);

  if (!place) {
    throw new Error(`Missing place for candidate ${candidate.id}`);
  }

  const relatedPlace = toPlaceWithState(place);
  const publishedQuest = demoQuests.find(
    (quest) => quest.id === candidate.published_quest_id,
  );

  return {
    ...candidate,
    place: relatedPlace,
    published_quest: publishedQuest
      ? {
          id: publishedQuest.id,
          title: publishedQuest.title,
        }
      : null,
    suggested_category:
      demoQuestCategories.find(
        (category) => category.id === candidate.suggested_category_id,
      ) ?? null,
    sponsor_business:
      demoSponsors.find((sponsor) => sponsor.id === candidate.sponsor_business_id) ??
      null,
  };
}

function createInitialStore(): MockAdminStore {
  return {
    badges: clone(demoBadges),
    categories: clone(demoQuestCategories),
    places: clone(demoPlaces.map(toPlaceWithState)),
    quests: clone(demoQuests),
    questCandidates: clone(demoQuestCandidates.map(toQuestCandidateWithRelations)),
    rewards: clone([...demoRewards]),
    sponsors: clone(demoSponsors),
    states: clone(demoStates),
    titles: clone(demoTitles),
  };
}

export function getMockAdminStore() {
  if (!globalThis.__ROVEXP_ADMIN_STORE__) {
    globalThis.__ROVEXP_ADMIN_STORE__ = createInitialStore();
  }

  return globalThis.__ROVEXP_ADMIN_STORE__;
}
