export interface TextFieldTemplate {
  id: string;
  label: string;
  defaultContent: string;
  /** mm, relative to the CUT/trim corner (0,0 = the finished card's own
   * top-left corner) — NOT the full-bleed canvas. Toolbar.tsx adds the
   * cut-to-canvas offset when placing these. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontSizePt: number;
  fontWeight: "normal" | "bold";
  align: "left" | "center" | "right";
}

/**
 * Default placements for the standard MTG-style text fields, positioned to
 * roughly match a classic Magic: The Gathering card layout at the cut size
 * (62.992 x 87.884mm — see STANDARD_CARD_SIZE_MM). Every field is an
 * independent constant, not derived from a shared grid formula, precisely
 * so a slight misalignment against a particular frame can be fixed by
 * hand-editing just that one field's numbers here without touching the
 * others or any layout logic.
 */
export const MTG_TEXT_TEMPLATES: TextFieldTemplate[] = [
  {
    id: "title",
    label: "Title",
    defaultContent: "Card Name",
    x: 2.5,
    y: 2.6,
    width: 42,
    height: 5.3,
    fontSizePt: 13,
    fontWeight: "bold",
    align: "left",
  },
  {
    id: "manaCost",
    label: "Mana Cost",
    defaultContent: "{2}{W}{W}",
    x: 45.4,
    y: 2.6,
    width: 15.1,
    height: 5.3,
    fontSizePt: 11,
    fontWeight: "normal",
    align: "right",
  },
  {
    id: "nickname",
    label: "Nickname",
    defaultContent: "(Nickname)",
    x: 2.5,
    y: 8.4,
    width: 42,
    height: 3.5,
    fontSizePt: 7,
    fontWeight: "normal",
    align: "left",
  },
  {
    id: "typeline",
    label: "Typeline",
    defaultContent: "Creature — Human Wizard",
    x: 2.5,
    y: 51,
    width: 58,
    height: 5.3,
    fontSizePt: 9,
    fontWeight: "normal",
    align: "left",
  },
  {
    id: "rules",
    label: "Rules Text",
    defaultContent: "Rules text goes here.",
    x: 2.5,
    y: 57.1,
    width: 58,
    height: 13.2,
    fontSizePt: 8,
    fontWeight: "normal",
    align: "left",
  },
  {
    id: "flavor",
    label: "Flavour Text",
    defaultContent: "Flavor text goes here.",
    x: 2.5,
    y: 70.3,
    width: 58,
    height: 7.9,
    fontSizePt: 8,
    fontWeight: "normal",
    align: "left",
  },
  {
    id: "powerToughness",
    label: "Power/Toughness",
    defaultContent: "0/0",
    x: 47.2,
    y: 78.2,
    width: 13.2,
    height: 5.3,
    fontSizePt: 11,
    fontWeight: "bold",
    align: "center",
  },
  {
    id: "artist",
    label: "Artist/Credit",
    defaultContent: "Illus. Artist Name",
    x: 2.5,
    y: 84.4,
    width: 44,
    height: 2.6,
    fontSizePt: 6,
    fontWeight: "normal",
    align: "left",
  },
];
