/**
 * Curated emoji catalog, grouped by category with searchable names.
 *
 * Data is a static, offline table; nothing here fetches or embeds remote
 * content. Rendering relies on the device emoji font, so coverage varies by
 * Android version.
 */

export interface EmojiEntry {
  emoji: string
  name: string
}

export interface EmojiCategory {
  name: string
  emojis: EmojiEntry[]
}

export const emojiCategories: readonly EmojiCategory[] = [
  {
    name: "Smileys",
    emojis: [
      { emoji: "😀", name: "grinning" },
      { emoji: "😃", name: "smiley" },
      { emoji: "😄", name: "smile" },
      { emoji: "😁", name: "grin" },
      { emoji: "😆", name: "laughing" },
      { emoji: "😅", name: "sweat smile" },
      { emoji: "🤣", name: "rofl" },
      { emoji: "😂", name: "joy" },
      { emoji: "🙂", name: "slight smile" },
      { emoji: "😉", name: "wink" },
      { emoji: "😊", name: "blush" },
      { emoji: "😇", name: "innocent" },
      { emoji: "😍", name: "heart eyes" },
      { emoji: "🥰", name: "smiling heart" },
      { emoji: "😘", name: "kissing heart" },
      { emoji: "😋", name: "yummy" },
      { emoji: "😎", name: "cool" },
      { emoji: "🤩", name: "star struck" },
      { emoji: "😏", name: "smirk" },
      { emoji: "😒", name: "unamused" },
      { emoji: "🙄", name: "eye roll" },
      { emoji: "😬", name: "grimacing" },
      { emoji: "🤔", name: "thinking" },
      { emoji: "🤯", name: "mind blown" },
      { emoji: "😱", name: "scream" },
      { emoji: "😨", name: "fearful" },
      { emoji: "😰", name: "anxious" },
      { emoji: "😢", name: "cry" },
      { emoji: "😭", name: "sob" },
      { emoji: "😤", name: "huff" },
      { emoji: "😡", name: "angry" },
      { emoji: "🤬", name: "cursing" },
      { emoji: "💀", name: "skull" },
    ],
  },
  {
    name: "Gestures",
    emojis: [
      { emoji: "👍", name: "thumbs up" },
      { emoji: "👎", name: "thumbs down" },
      { emoji: "👏", name: "clap" },
      { emoji: "🙌", name: "raising hands" },
      { emoji: "🤝", name: "handshake" },
      { emoji: "🙏", name: "pray" },
      { emoji: "✌️", name: "peace" },
      { emoji: "🤞", name: "crossed fingers" },
      { emoji: "🤟", name: "love you" },
      { emoji: "🤘", name: "rock on" },
      { emoji: "👋", name: "wave" },
      { emoji: "🤙", name: "call me" },
      { emoji: "💪", name: "flex" },
      { emoji: "✍️", name: "writing" },
      { emoji: "🤳", name: "selfie" },
      { emoji: "💅", name: "nail polish" },
    ],
  },
  {
    name: "Hearts",
    emojis: [
      { emoji: "❤️", name: "red heart" },
      { emoji: "🧡", name: "orange heart" },
      { emoji: "💛", name: "yellow heart" },
      { emoji: "💚", name: "green heart" },
      { emoji: "💙", name: "blue heart" },
      { emoji: "💜", name: "purple heart" },
      { emoji: "🖤", name: "black heart" },
      { emoji: "🤍", name: "white heart" },
      { emoji: "🤎", name: "brown heart" },
      { emoji: "💔", name: "broken heart" },
      { emoji: "❣️", name: "exclamation heart" },
      { emoji: "💕", name: "two hearts" },
      { emoji: "💞", name: "revolving hearts" },
      { emoji: "💓", name: "beating heart" },
      { emoji: "💗", name: "growing heart" },
      { emoji: "💖", name: "sparkling heart" },
      { emoji: "💘", name: "cupid heart" },
    ],
  },
  {
    name: "Nature",
    emojis: [
      { emoji: "🔥", name: "fire" },
      { emoji: "✨", name: "sparkles" },
      { emoji: "⚡", name: "lightning" },
      { emoji: "🌈", name: "rainbow" },
      { emoji: "⭐", name: "star" },
      { emoji: "🌟", name: "glowing star" },
      { emoji: "💫", name: "dizzy star" },
      { emoji: "🌸", name: "cherry blossom" },
      { emoji: "🌺", name: "hibiscus" },
      { emoji: "🌻", name: "sunflower" },
      { emoji: "🍀", name: "four leaf clover" },
      { emoji: "🌲", name: "evergreen" },
      { emoji: "🌊", name: "wave" },
      { emoji: "🌙", name: "crescent moon" },
      { emoji: "☀️", name: "sun" },
      { emoji: "🌪️", name: "tornado" },
      { emoji: "💧", name: "droplet" },
    ],
  },
  {
    name: "Tech",
    emojis: [
      { emoji: "💻", name: "laptop" },
      { emoji: "🖥️", name: "desktop" },
      { emoji: "📱", name: "phone" },
      { emoji: "⌨️", name: "keyboard" },
      { emoji: "🖱️", name: "mouse" },
      { emoji: "🎮", name: "gamepad" },
      { emoji: "🤖", name: "robot" },
      { emoji: "🔌", name: "plug" },
      { emoji: "🔋", name: "battery" },
      { emoji: "📡", name: "satellite" },
      { emoji: "🔒", name: "lock" },
      { emoji: "🔑", name: "key" },
      { emoji: "⚙️", name: "gear" },
      { emoji: "🛠️", name: "tools" },
      { emoji: "🐛", name: "bug" },
      { emoji: "🚀", name: "rocket" },
      { emoji: "🧪", name: "test tube" },
    ],
  },
  {
    name: "Food",
    emojis: [
      { emoji: "🍕", name: "pizza" },
      { emoji: "🍔", name: "burger" },
      { emoji: "🌮", name: "taco" },
      { emoji: "🍣", name: "sushi" },
      { emoji: "🍜", name: "ramen" },
      { emoji: "☕", name: "coffee" },
      { emoji: "🍺", name: "beer" },
      { emoji: "🥂", name: "champagne" },
      { emoji: "🍷", name: "wine" },
      { emoji: "🍰", name: "cake" },
      { emoji: "🍪", name: "cookie" },
      { emoji: "🍩", name: "donut" },
      { emoji: "🍦", name: "ice cream" },
      { emoji: "🧁", name: "cupcake" },
    ],
  },
  {
    name: "Symbols",
    emojis: [
      { emoji: "✅", name: "check" },
      { emoji: "❌", name: "cross" },
      { emoji: "⚠️", name: "warning" },
      { emoji: "🚫", name: "prohibited" },
      { emoji: "♻️", name: "recycle" },
      { emoji: "💯", name: "100" },
      { emoji: "📌", name: "pin" },
      { emoji: "📎", name: "paperclip" },
      { emoji: "🔗", name: "link" },
      { emoji: "🎯", name: "target" },
      { emoji: "🏆", name: "trophy" },
      { emoji: "🎪", name: "circus" },
      { emoji: "💎", name: "gem" },
      { emoji: "🔔", name: "bell" },
      { emoji: "🎵", name: "music" },
      { emoji: "📢", name: "megaphone" },
      { emoji: "💬", name: "speech bubble" },
    ],
  },
]

export const allEmojis: readonly EmojiEntry[] = emojiCategories.flatMap(
  (category) => category.emojis,
)

/**
 * Filters categories by search text and an optional active category name.
 * The search matches emoji names and the emoji characters themselves, both
 * case-insensitively. Passing null shows every category.
 */
export function filterEmojiCategories(
  search: string,
  activeCategory: string | null,
): EmojiCategory[] {
  const query = search.trim().toLowerCase()
  const scoped =
    activeCategory === null
      ? emojiCategories
      : emojiCategories.filter((category) => category.name === activeCategory)
  if (query === "") return [...scoped]
  return scoped
    .map((category) => ({
      ...category,
      emojis: category.emojis.filter(
        (entry) => entry.name.toLowerCase().includes(query) || entry.emoji.includes(query),
      ),
    }))
    .filter((category) => category.emojis.length > 0)
}
