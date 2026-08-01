// Ported from the prototype's problems.js. Statements are OUR wording (see docs).
// The object literal is unchanged except for TS typing; check() gains param types.
import type { CheckResult, ProblemContent } from './types'

export const CONTENT: Record<string, ProblemContent> = {

// ─────────────────────────────────────────────── Arrays & Hashing
"contains-duplicate": {
  fn: "containsDuplicate",
  brief: "Does any value appear more than once?",
  statement: `<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears
    <strong>at least twice</strong>, and <code>false</code> if every element is distinct.</p>`,
  examples: [
    { in: "nums = [1,2,3,1]", out: "true", note: "1 appears twice." },
    { in: "nums = [1,2,3,4]", out: "false", note: "All distinct." },
  ],
  constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁹ ≤ nums[i] ≤ 10⁹"],
  starter: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
var containsDuplicate = function(nums) {

};`,
  tests: [
    { args: [[1, 2, 3, 1]], expect: true },
    { args: [[1, 2, 3, 4]], expect: false },
    { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expect: true },
    { args: [[7]], expect: false },
    { args: [[0, 0]], expect: true },
  ],
  stress: {
    note: "20k distinct values — a nested scan or repeated indexOf won't finish in time",
    budgetMs: 300,
    args: () => [Array.from({ length: 20000 }, (_, i) => i)],
    expect: false,
  },
},

"valid-anagram": {
  fn: "isAnagram",
  brief: "Same letters, same counts?",
  statement: `<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if
    <code>t</code> is an anagram of <code>s</code> — the same letters with the same counts, in any order.</p>`,
  examples: [
    { in: `s = "anagram", t = "nagaram"`, out: "true" },
    { in: `s = "rat", t = "car"`, out: "false" },
  ],
  constraints: ["1 ≤ s.length, t.length ≤ 5·10⁴", "s and t contain lowercase English letters"],
  starter: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
var isAnagram = function(s, t) {

};`,
  tests: [
    { args: ["anagram", "nagaram"], expect: true },
    { args: ["rat", "car"], expect: false },
    { args: ["a", "ab"], expect: false },
    { args: ["aacc", "ccac"], expect: false },
    { args: ["", ""], expect: true },
  ],
},

"two-sum": {
  fn: "twoSum",
  brief: "Indices of the two numbers that add to target.",
  statement: `<p>Given an array <code>nums</code> and an integer <code>target</code>, return the
    <strong>indices</strong> of the two numbers that add up to <code>target</code>.</p>
    <p>Exactly one valid answer exists, and you may not use the same element twice.
    Return the indices in any order.</p>`,
  examples: [
    { in: "nums = [2,7,11,15], target = 9", out: "[0,1]", note: "nums[0] + nums[1] === 9" },
    { in: "nums = [3,2,4], target = 6", out: "[1,2]" },
  ],
  constraints: ["2 ≤ nums.length ≤ 10⁴", "Exactly one solution exists"],
  starter: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {

};`,
  cmp: "unordered",
  tests: [
    { args: [[2, 7, 11, 15], 9], expect: [0, 1] },
    { args: [[3, 2, 4], 6], expect: [1, 2] },
    { args: [[3, 3], 6], expect: [0, 1] },
    { args: [[-1, -2, -3, -4, -5], -8], expect: [2, 4] },
  ],
  stress: {
    note: "40k elements, answer at the very end — O(n²) won't finish in time",
    budgetMs: 300,
    args: () => {
      const n = 40000, nums = Array.from({ length: n }, (_, i) => i * 2);
      return [nums, nums[n - 2] + nums[n - 1]];
    },
    expect: [39998, 39999],
  },
},

"group-anagrams": {
  fn: "groupAnagrams",
  brief: "Bucket the words that are anagrams of each other.",
  statement: `<p>Given an array of strings <code>strs</code>, group the anagrams together.
    Return the groups in any order, and the words within each group in any order.</p>`,
  examples: [
    { in: `strs = ["eat","tea","tan","ate","nat","bat"]`,
      out: `[["bat"],["nat","tan"],["ate","eat","tea"]]` },
    { in: `strs = [""]`, out: `[[""]]` },
  ],
  constraints: ["1 ≤ strs.length ≤ 10⁴", "0 ≤ strs[i].length ≤ 100", "lowercase English letters"],
  starter: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
var groupAnagrams = function(strs) {

};`,
  cmp: "groups",
  tests: [
    { args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
      expect: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]] },
    { args: [[""]], expect: [[""]] },
    { args: [["a"]], expect: [["a"]] },
    { args: [["abc", "cba", "bac", "xyz"]], expect: [["abc", "bac", "cba"], ["xyz"]] },
    // repeated letters: a key built from the SET of letters would wrongly merge all of these
    { args: [["aab", "aba", "abb", "ab", "ba"]],
      expect: [["aab", "aba"], ["abb"], ["ab", "ba"]] },
  ],
},

"top-k-frequent-elements": {
  fn: "topKFrequent",
  brief: "The k most common values.",
  statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return the
    <code>k</code> most frequent elements, in any order.</p>
    <p>The answer is guaranteed to be unique.</p>
    <p class="hint">Can you beat O(n log n)?</p>`,
  examples: [
    { in: "nums = [1,1,1,2,2,3], k = 2", out: "[1,2]" },
    { in: "nums = [1], k = 1", out: "[1]" },
  ],
  constraints: ["1 ≤ nums.length ≤ 10⁵", "1 ≤ k ≤ number of distinct elements"],
  starter: `/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
var topKFrequent = function(nums, k) {

};`,
  cmp: "unordered",
  tests: [
    { args: [[1, 1, 1, 2, 2, 3], 2], expect: [1, 2] },
    { args: [[1], 1], expect: [1] },
    { args: [[12, 12, 12, 30, 30, 44], 2], expect: [12, 30] },
    { args: [[1, 2], 2], expect: [1, 2] },
    { args: [[5, 5, 5, 5], 1], expect: [5] },
    // the most frequent value is NOT the first one seen — catches "return the first k distinct"
    { args: [[3, 0, 1, 0], 1], expect: [0] },
    { args: [[4, 1, -1, 2, -1, 2, 3], 2], expect: [-1, 2] },
  ],
},

"encode-and-decode-strings": {
  premium: true,
  fn: "encode",
  fn2: "decode",
  brief: "Serialise a list of strings to one string, and back.",
  statement: `<p>Write two functions. <code>encode(strs)</code> turns an array of strings into a single
    string. <code>decode(s)</code> turns that string back into the original array.</p>
    <p>The strings may contain <em>any</em> characters, including whatever delimiter you were
    tempted to use. Your encoding has to survive that.</p>
    <p class="hint">A separator alone is not enough. What extra information makes it unambiguous?</p>`,
  examples: [
    { in: `["neet","code","love","you"]`, out: `["neet","code","love","you"]`,
      note: "decode(encode(x)) must equal x" },
    { in: `["we","say",":","yes"]`, out: `["we","say",":","yes"]`,
      note: "Note the literal colon." },
  ],
  constraints: ["0 ≤ strs.length ≤ 200", "0 ≤ strs[i].length ≤ 200", "any ASCII characters"],
  starter: `/**
 * @param {string[]} strs
 * @return {string}
 */
var encode = function(strs) {

};

/**
 * @param {string} s
 * @return {string[]}
 */
var decode = function(s) {

};`,
  // round-trip: encode then decode must return the original
  roundTrip: true,
  tests: [
    { args: [["neet", "code", "love", "you"]] },
    { args: [["we", "say", ":", "yes"]] },
    { args: [[""]] },
    { args: [[]] },
    { args: [["", "", ""]] },
    { args: [["a#b", "3#c", "##", "1#"]] },
    { args: [["12", "34"]] },
  ],
},

"product-of-array-except-self": {
  fn: "productExceptSelf",
  brief: "Products of everything but yourself — no division.",
  statement: `<p>Given an integer array <code>nums</code>, return an array <code>answer</code> where
    <code>answer[i]</code> is the product of every element <em>except</em> <code>nums[i]</code>.</p>
    <p>Solve it without using division, in O(n) time.</p>`,
  examples: [
    { in: "nums = [1,2,3,4]", out: "[24,12,8,6]" },
    { in: "nums = [-1,1,0,-3,3]", out: "[0,0,9,0,0]" },
  ],
  constraints: ["2 ≤ nums.length ≤ 10⁵", "The product of any prefix or suffix fits in 32 bits"],
  starter: `/**
 * @param {number[]} nums
 * @return {number[]}
 */
var productExceptSelf = function(nums) {

};`,
  tests: [
    { args: [[1, 2, 3, 4]], expect: [24, 12, 8, 6] },
    { args: [[-1, 1, 0, -3, 3]], expect: [0, 0, 9, 0, 0] },
    { args: [[2, 3]], expect: [3, 2] },
    { args: [[0, 0]], expect: [0, 0] },
    { args: [[1, 0]], expect: [0, 1] },
  ],
},

"valid-sudoku": {
  fn: "isValidSudoku",
  brief: "Are the filled cells legal?",
  statement: `<p>Given a 9×9 board, decide whether the <strong>filled</strong> cells break any Sudoku rule:</p>
    <ul>
      <li>No repeated digit in any row.</li>
      <li>No repeated digit in any column.</li>
      <li>No repeated digit in any of the nine 3×3 sub-boxes.</li>
    </ul>
    <p>Empty cells are <code>"."</code>. The board need not be solvable — only currently valid.</p>`,
  examples: [{ in: "a board with two 8s in the top-left box", out: "false" }],
  constraints: ["board.length === 9", "board[i].length === 9", `cells are "1"–"9" or "."`],
  starter: `/**
 * @param {character[][]} board
 * @return {boolean}
 */
var isValidSudoku = function(board) {

};`,
  tests: [
    { args: [[["5","3",".",".","7",".",".",".","."],
              ["6",".",".","1","9","5",".",".","."],
              [".","9","8",".",".",".",".","6","."],
              ["8",".",".",".","6",".",".",".","3"],
              ["4",".",".","8",".","3",".",".","1"],
              ["7",".",".",".","2",".",".",".","6"],
              [".","6",".",".",".",".","2","8","."],
              [".",".",".","4","1","9",".",".","5"],
              [".",".",".",".","8",".",".","7","9"]]], expect: true },
    { args: [[["8","3",".",".","7",".",".",".","."],
              ["6",".",".","1","9","5",".",".","."],
              [".","9","8",".",".",".",".","6","."],
              ["8",".",".",".","6",".",".",".","3"],
              ["4",".",".","8",".","3",".",".","1"],
              ["7",".",".",".","2",".",".",".","6"],
              [".","6",".",".",".",".","2","8","."],
              [".",".",".","4","1","9",".",".","5"],
              [".",".",".",".","8",".",".","7","9"]]], expect: false },
    // clean by row and by column, but the top-left 3x3 box holds two 1s
    { args: [[["1",".",".",".",".",".",".",".","."],
              [".","1",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."]]], expect: false },
    { args: [[[".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."],
              [".",".",".",".",".",".",".",".","."]]], expect: true },
  ],
},

"longest-consecutive-sequence": {
  fn: "longestConsecutive",
  brief: "Longest run of consecutive integers — in O(n).",
  statement: `<p>Given an unsorted array <code>nums</code>, return the length of the longest sequence of
    <strong>consecutive</strong> integers present in it. The numbers need not be adjacent in the array.</p>
    <p>Your algorithm must run in O(n) time — so no sorting.</p>`,
  examples: [
    { in: "nums = [100,4,200,1,3,2]", out: "4", note: "The run 1,2,3,4." },
    { in: "nums = [0,3,7,2,5,8,4,6,0,1]", out: "9" },
  ],
  constraints: ["0 ≤ nums.length ≤ 10⁵", "-10⁹ ≤ nums[i] ≤ 10⁹"],
  starter: `/**
 * @param {number[]} nums
 * @return {number}
 */
var longestConsecutive = function(nums) {

};`,
  tests: [
    { args: [[100, 4, 200, 1, 3, 2]], expect: 4 },
    { args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], expect: 9 },
    { args: [[]], expect: 0 },
    { args: [[1, 2, 0, 1]], expect: 3 },
    { args: [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]], expect: 7 },
  ],
  stress: {
    note: "20k shuffled values forming one long run — catches O(n²) walking",
    budgetMs: 300,
    args: () => {
      const n = 20000, a = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {           // deterministic shuffle
        const j = (i * 7919) % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return [a];
    },
    expect: 20000,
  },
},

// ─────────────────────────────────────────────── Two Pointers
"valid-palindrome": {
  fn: "isPalindrome",
  brief: "Reads the same both ways, ignoring punctuation and case.",
  statement: `<p>A phrase is a palindrome if, after lowercasing and removing everything that isn't a
    letter or digit, it reads the same forwards and backwards.</p>
    <p>Return <code>true</code> if <code>s</code> is a palindrome.</p>`,
  examples: [
    { in: `s = "A man, a plan, a canal: Panama"`, out: "true", note: `Becomes "amanaplanacanalpanama".` },
    { in: `s = "race a car"`, out: "false" },
    { in: `s = " "`, out: "true", note: "Empty after cleaning." },
  ],
  constraints: ["1 ≤ s.length ≤ 2·10⁵", "printable ASCII"],
  starter: `/**
 * @param {string} s
 * @return {boolean}
 */
var isPalindrome = function(s) {

};`,
  tests: [
    { args: ["A man, a plan, a canal: Panama"], expect: true },
    { args: ["race a car"], expect: false },
    { args: [" "], expect: true },
    { args: ["0P"], expect: false },
    { args: ["ab_a"], expect: true },
  ],
},

"two-sum-ii-input-array-is-sorted": {
  fn: "twoSum",
  brief: "Two Sum, but sorted — and O(1) extra space.",
  statement: `<p><code>numbers</code> is sorted in non-decreasing order. Find the two numbers that add up to
    <code>target</code> and return their <strong>1-indexed</strong> positions as
    <code>[index1, index2]</code> with <code>index1 &lt; index2</code>.</p>
    <p>Exactly one solution exists. Use only constant extra space — so no hash map.</p>`,
  examples: [
    { in: "numbers = [2,7,11,15], target = 9", out: "[1,2]" },
    { in: "numbers = [2,3,4], target = 6", out: "[1,3]" },
  ],
  constraints: ["2 ≤ numbers.length ≤ 3·10⁴", "sorted non-decreasing", "exactly one solution"],
  starter: `/**
 * @param {number[]} numbers
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(numbers, target) {

};`,
  tests: [
    { args: [[2, 7, 11, 15], 9], expect: [1, 2] },
    { args: [[2, 3, 4], 6], expect: [1, 3] },
    { args: [[-1, 0], -1], expect: [1, 2] },
    { args: [[1, 2, 3, 4, 4, 9, 56, 90], 8], expect: [4, 5] },
  ],
},

"3sum": {
  fn: "threeSum",
  brief: "All unique triples summing to zero.",
  statement: `<p>Given an integer array <code>nums</code>, return every <strong>unique</strong> triple
    <code>[a, b, c]</code> such that <code>a + b + c === 0</code>.</p>
    <p>No triple may be repeated in the output. Order of triples, and order within a triple, doesn't matter
    for grading here.</p>`,
  examples: [
    { in: "nums = [-1,0,1,2,-1,-4]", out: "[[-1,-1,2],[-1,0,1]]" },
    { in: "nums = [0,1,1]", out: "[]" },
    { in: "nums = [0,0,0]", out: "[[0,0,0]]" },
  ],
  constraints: ["3 ≤ nums.length ≤ 3000", "-10⁵ ≤ nums[i] ≤ 10⁵"],
  starter: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var threeSum = function(nums) {

};`,
  cmp: "groups",
  tests: [
    { args: [[-1, 0, 1, 2, -1, -4]], expect: [[-1, -1, 2], [-1, 0, 1]] },
    { args: [[0, 1, 1]], expect: [] },
    { args: [[0, 0, 0]], expect: [[0, 0, 0]] },
    { args: [[-2, 0, 1, 1, 2]], expect: [[-2, 0, 2], [-2, 1, 1]] },
    { args: [[0, 0, 0, 0]], expect: [[0, 0, 0]] },        // one triple, not four
    { args: [[-1, 0, 1, 0, -1, 1]], expect: [[-1, 0, 1]] },
  ],
  stress: {
    note: "900 values with no zero-sum triple — O(n³) won't finish in time",
    budgetMs: 400,
    args: () => [Array.from({ length: 900 }, (_, i) => i + 1)],
    expect: [],
  },
},

"container-with-most-water": {
  fn: "maxArea",
  brief: "Two lines and the x-axis — biggest rectangle.",
  statement: `<p><code>height[i]</code> is the height of a vertical line at position <code>i</code>.
    Pick two lines so that the container they form with the x-axis holds the most water.</p>
    <p>Return that maximum area. The water level is capped by the <em>shorter</em> of the two lines,
    and the width is the distance between them.</p>`,
  examples: [
    { in: "height = [1,8,6,2,5,4,8,3,7]", out: "49", note: "Lines at index 1 and 8: min(8,7) × 7." },
    { in: "height = [1,1]", out: "1" },
  ],
  constraints: ["2 ≤ height.length ≤ 10⁵", "0 ≤ height[i] ≤ 10⁴"],
  starter: `/**
 * @param {number[]} height
 * @return {number}
 */
var maxArea = function(height) {

};`,
  tests: [
    { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expect: 49 },
    { args: [[1, 1]], expect: 1 },
    { args: [[4, 3, 2, 1, 4]], expect: 16 },
    { args: [[1, 2, 1]], expect: 2 },
  ],
  stress: {
    note: "40k bars, best pair at the two ends — O(n²) won't finish in time",
    budgetMs: 300,
    args: () => {
      const n = 40000, h = new Array(n).fill(1);
      h[0] = h[n - 1] = 10000;
      return [h];
    },
    expect: 399990000,
  },
},

"trapping-rain-water": {
  fn: "trap",
  brief: "How much water sits in the dips?",
  statement: `<p><code>height</code> is an elevation map where each bar has width 1. After it rains,
    return how many units of water are trapped between the bars.</p>
    <p>Water above a position is bounded by the tallest bar to its left and the tallest to its right —
    whichever is shorter.</p>`,
  examples: [
    { in: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", out: "6" },
    { in: "height = [4,2,0,3,2,5]", out: "9" },
  ],
  constraints: ["1 ≤ height.length ≤ 2·10⁴", "0 ≤ height[i] ≤ 10⁵"],
  starter: `/**
 * @param {number[]} height
 * @return {number}
 */
var trap = function(height) {

};`,
  tests: [
    { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expect: 6 },
    { args: [[4, 2, 0, 3, 2, 5]], expect: 9 },
    { args: [[3]], expect: 0 },
    { args: [[5, 4, 3, 2, 1]], expect: 0 },
    { args: [[2, 0, 2]], expect: 2 },
  ],
  stress: {
    note: "40k bars, tall walls at both ends — O(n²) rescanning won't finish in time",
    budgetMs: 300,
    args: () => {
      const n = 40000, h = new Array(n).fill(0);
      h[0] = h[n - 1] = 1000;
      return [h];
    },
    expect: 39998000,
  },
},

// ─────────────────────────────────────────────── Premium (paywalled on LeetCode)
"meeting-rooms": {
  premium: true,
  fn: "canAttendMeetings",
  brief: "Can one person attend every meeting?",
  statement: `<p>Given an array of meeting time intervals <code>[start, end]</code>, return
    <code>true</code> if a single person could attend all of them — that is, no two meetings overlap.</p>
    <p>A meeting ending exactly when another starts is fine.</p>`,
  examples: [
    { in: "intervals = [[0,30],[5,10],[15,20]]", out: "false", note: "[0,30] clashes with [5,10]." },
    { in: "intervals = [[7,10],[2,4]]", out: "true" },
  ],
  constraints: ["0 ≤ intervals.length ≤ 10⁴", "0 ≤ start < end ≤ 10⁶"],
  starter: `/**
 * @param {number[][]} intervals
 * @return {boolean}
 */
var canAttendMeetings = function(intervals) {

};`,
  tests: [
    { args: [[[0, 30], [5, 10], [15, 20]]], expect: false },
    { args: [[[7, 10], [2, 4]]], expect: true },
    { args: [[]], expect: true },
    { args: [[[1, 5], [5, 9]]], expect: true },
    { args: [[[13, 15], [1, 13]]], expect: true },
  ],
},

"meeting-rooms-ii": {
  premium: true,
  fn: "minMeetingRooms",
  brief: "Fewest rooms to host every meeting.",
  statement: `<p>Given meeting time intervals <code>[start, end]</code>, return the minimum number of
    rooms required so that no two meetings share a room at the same time.</p>
    <p>A meeting ending at time <code>t</code> frees the room for one starting at <code>t</code>.</p>
    <p class="hint">Think about the moment of peak overlap, not about assigning rooms.</p>`,
  examples: [
    { in: "intervals = [[0,30],[5,10],[15,20]]", out: "2" },
    { in: "intervals = [[7,10],[2,4]]", out: "1" },
  ],
  constraints: ["0 ≤ intervals.length ≤ 10⁴", "0 ≤ start < end ≤ 10⁶"],
  starter: `/**
 * @param {number[][]} intervals
 * @return {number}
 */
var minMeetingRooms = function(intervals) {

};`,
  tests: [
    { args: [[[0, 30], [5, 10], [15, 20]]], expect: 2 },
    { args: [[[7, 10], [2, 4]]], expect: 1 },
    { args: [[]], expect: 0 },
    { args: [[[1, 5], [5, 9], [9, 12]]], expect: 1 },
    { args: [[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]], expect: 4 },
  ],
},

"graph-valid-tree": {
  premium: true,
  fn: "validTree",
  brief: "Is this edge list a tree?",
  statement: `<p>You have <code>n</code> nodes labelled <code>0</code> to <code>n-1</code> and a list of
    undirected <code>edges</code>. Return <code>true</code> if they form a valid tree.</p>
    <p>A tree is <strong>connected</strong> and has <strong>no cycles</strong>.</p>
    <p class="hint">A tree on n nodes always has exactly n-1 edges. That check alone isn't sufficient — why not?</p>`,
  examples: [
    { in: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", out: "true" },
    { in: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]", out: "false", note: "Contains a cycle." },
  ],
  constraints: ["1 ≤ n ≤ 2000", "no duplicate edges", "no self-loops"],
  starter: `/**
 * @param {number} n
 * @param {number[][]} edges
 * @return {boolean}
 */
var validTree = function(n, edges) {

};`,
  tests: [
    { args: [5, [[0, 1], [0, 2], [0, 3], [1, 4]]], expect: true },
    { args: [5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]], expect: false },
    { args: [1, []], expect: true },
    { args: [2, []], expect: false },
    { args: [4, [[0, 1], [2, 3]]], expect: false },
    // exactly n-1 edges, but a cycle plus an isolated node — the edge count alone is not enough
    { args: [4, [[0, 1], [1, 2], [0, 2]]], expect: false },
    { args: [5, [[0, 1], [1, 2], [2, 0], [3, 4]]], expect: false },
  ],
},

"number-of-connected-components-in-an-undirected-graph": {
  premium: true,
  fn: "countComponents",
  brief: "How many separate islands of nodes?",
  statement: `<p>You have <code>n</code> nodes labelled <code>0</code> to <code>n-1</code> and a list of
    undirected <code>edges</code>. Return the number of connected components.</p>
    <p>An isolated node with no edges counts as its own component.</p>`,
  examples: [
    { in: "n = 5, edges = [[0,1],[1,2],[3,4]]", out: "2" },
    { in: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]", out: "1" },
  ],
  constraints: ["1 ≤ n ≤ 2000", "no duplicate edges", "no self-loops"],
  starter: `/**
 * @param {number} n
 * @param {number[][]} edges
 * @return {number}
 */
var countComponents = function(n, edges) {

};`,
  tests: [
    { args: [5, [[0, 1], [1, 2], [3, 4]]], expect: 2 },
    { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expect: 1 },
    { args: [4, []], expect: 4 },
    { args: [1, []], expect: 1 },
    { args: [6, [[0, 1], [2, 3], [4, 5]]], expect: 3 },
    // a cycle means edges outnumber what a forest needs — n - edges.length is wrong here
    { args: [5, [[0, 1], [1, 2], [0, 2], [3, 4]]], expect: 2 },
    { args: [4, [[0, 1], [1, 2], [2, 0]]], expect: 2 },
  ],
},

"walls-and-gates": {
  premium: true,
  fn: "wallsAndGates",
  brief: "Distance from every room to its nearest gate.",
  statement: `<p>A grid <code>rooms</code> where each cell is one of:</p>
    <ul>
      <li><code>-1</code> — a wall</li>
      <li><code>0</code> — a gate</li>
      <li><code>2147483647</code> — an empty room (treat as infinity)</li>
    </ul>
    <p>Fill each empty room with its distance to the <em>nearest</em> gate, moving only up/down/left/right.
    If no gate is reachable, leave it as infinity. Modify <code>rooms</code> in place; return nothing.</p>
    <p class="hint">Starting a search from every room is wasteful. What if you start from the gates instead?</p>`,
  examples: [
    { in: "a 4×4 grid with two gates", out: "each room holds its hop-count to the closest gate" },
  ],
  constraints: ["1 ≤ rows, cols ≤ 250"],
  starter: `/**
 * @param {number[][]} rooms
 * @return {void} modify rooms in place
 */
var wallsAndGates = function(rooms) {

};`,
  mode: "mutate",
  tests: [
    { args: [[[2147483647, -1, 0, 2147483647],
              [2147483647, 2147483647, 2147483647, -1],
              [2147483647, -1, 2147483647, -1],
              [0, -1, 2147483647, 2147483647]]],
      expect: [[3, -1, 0, 1], [2, 2, 1, -1], [1, -1, 2, -1], [0, -1, 3, 4]] },
    { args: [[[-1]]], expect: [[-1]] },
    { args: [[[0]]], expect: [[0]] },
    { args: [[[2147483647]]], expect: [[2147483647]] },
  ],
},

"alien-dictionary": {
  premium: true,
  fn: "alienOrder",
  brief: "Recover the alphabet from sorted words.",
  statement: `<p>You are given <code>words</code>, sorted lexicographically according to an unknown
    alphabet that uses lowercase English letters. Return a string of all letters that appear, ordered
    according to that alphabet.</p>
    <p>If the ordering is impossible (contradictory, or a longer word precedes its own prefix),
    return <code>""</code>. If several orderings are valid, any one is accepted.</p>
    <p class="hint">Comparing adjacent words gives you one ordering fact each. What structure turns a
    pile of "x before y" facts into a sequence?</p>`,
  examples: [
    { in: `words = ["wrt","wrf","er","ett","rftt"]`, out: `"wertf"` },
    { in: `words = ["z","x"]`, out: `"zx"` },
    { in: `words = ["abc","ab"]`, out: `""`, note: "A prefix must come first — contradiction." },
  ],
  constraints: ["1 ≤ words.length ≤ 100", "1 ≤ words[i].length ≤ 100", "lowercase English letters"],
  starter: `/**
 * @param {string[]} words
 * @return {string}
 */
var alienOrder = function(words) {

};`,
  // several orderings can be correct — validate rather than compare
  check(out: unknown, args: Array<unknown>): CheckResult {
    const words = args[0];
    if (typeof out !== "string") return { ok: false, why: "expected a string" };

    const letters = new Set(words.join(""));
    const pairs = [];
    let impossible = false;
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i], b = words[i + 1];
      let j = 0;
      while (j < a.length && j < b.length && a[j] === b[j]) j++;
      if (j === b.length && a.length > b.length) { impossible = true; break; }
      if (j < a.length && j < b.length) pairs.push([a[j], b[j]]);
    }
    // contradiction? then "" is the only right answer
    const cyclic = impossible || hasCycle(letters, pairs);
    if (cyclic) return out === ""
      ? { ok: true }
      : { ok: false, why: `no valid ordering exists, expected "" but got "${out}"` };

    if (out.length !== letters.size || new Set(out).size !== out.length)
      return { ok: false, why: `expected each of ${[...letters].sort().join("")} exactly once` };
    for (const ch of out) if (!letters.has(ch))
      return { ok: false, why: `"${ch}" does not appear in the input` };

    const pos = new Map([...out].map((c, i) => [c, i]));
    for (const [x, y] of pairs) if (pos.get(x) > pos.get(y))
      return { ok: false, why: `"${x}" must come before "${y}"` };
    return { ok: true };

    function hasCycle(nodes, edges) {
      const adj = new Map([...nodes].map(n => [n, []]));
      for (const [x, y] of edges) adj.get(x).push(y);
      const state = new Map();
      const walk = n => {
        if (state.get(n) === 1) return true;
        if (state.get(n) === 2) return false;
        state.set(n, 1);
        for (const m of adj.get(n)) if (walk(m)) return true;
        state.set(n, 2);
        return false;
      };
      return [...nodes].some(walk);
    }
  },
  tests: [
    { args: [["wrt", "wrf", "er", "ett", "rftt"]] },
    { args: [["z", "x"]] },
    { args: [["z", "x", "z"]] },
    { args: [["abc", "ab"]] },
    { args: [["ac", "ab", "zc", "zb"]] },
    { args: [["a"]] },
  ],
},

}
