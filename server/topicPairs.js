// プリセットお題ペアデータ
const TOPIC_PAIRS = [
  ["ラーメン", "うどん"],
  ["犬", "猫"],
  ["サッカー", "野球"],
  ["東京", "大阪"],
  ["ビール", "ワイン"],
  ["映画", "ドラマ"],
  ["春", "秋"],
  ["海", "山"],
  ["ピアノ", "ギター"],
  ["カレー", "シチュー"],
  ["コーヒー", "紅茶"],
  ["新幹線", "飛行機"],
  ["寿司", "焼肉"],
  ["Twitter", "Instagram"],
  ["温泉", "サウナ"],
  ["花火", "イルミネーション"],
  ["朝", "夜"],
  ["チョコ", "グミ"],
  ["遊園地", "水族館"],
  ["漫画", "アニメ"],
];

// ランダムにペアを1つ選ぶ
function getRandomPair() {
  const index = Math.floor(Math.random() * TOPIC_PAIRS.length);
  const pair = TOPIC_PAIRS[index];
  // ランダムにどちらを多数派にするか決める
  if (Math.random() < 0.5) {
    return { majorityTopic: pair[0], wolfTopic: pair[1] };
  }
  return { majorityTopic: pair[1], wolfTopic: pair[0] };
}

module.exports = { TOPIC_PAIRS, getRandomPair };
