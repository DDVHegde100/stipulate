#!/usr/bin/env python3
"""Generate LeetCode pattern sections for leetcode-patterns-mastery.html"""

from pathlib import Path

def tmpl(label, code):
    return f'<div class="template-label">{label}</div><pre><code>{code.strip()}</code></pre>'

def prob(name, diff, desc, hint, approach):
    return f'''<div class="practice-card">
      <h5>{name} <span class="difficulty">({diff})</span></h5>
      <p>{desc}</p>
      <p class="hint"><strong>Hint:</strong> {hint}</p>
      <details><summary>Expected approach (only after attempting)</summary><p>{approach}</p></details>
    </div>'''

def section(id_, num, title, signals, dsa, why, complexity, templates, variations, pitfalls, where, problems, walkthrough="", memory=""):
    sig = "".join(f"<li>{s}</li>" for s in signals)
    pit = "".join(f"<li>{p}</li>" for p in pitfalls)
    walk = f'<h3>Worked Example — Step by Step</h3><div class="walkthrough">{walkthrough}</div>' if walkthrough else ""
    mem = f'<h3>Memory Drill — Write This From Memory Tonight</h3><div class="memory-box">{memory}</div>' if memory else ""
    return f'''
  <section class="pattern" id="{id_}">
    <h2><span class="pattern-num">Pattern {num}</span><br>{title}</h2>
    <h3>Recognition Signals — "When do I use this?"</h3>
    <div class="signal-box"><strong>Look for these clues:</strong><ul>{sig}</ul></div>
    <h3>Underlying Data Structure & Theory</h3>
    {dsa}
    <h3>Why This Approach Works (and Beats Alternatives)</h3>
    <div class="why-box">{why}</div>
    <h3>Time & Space Complexity</h3>
    <div class="complexity-box">{complexity}</div>
    {walk}
    <h3>Memorizable Templates</h3>
    {templates}
    <h3>Common Variations & How to Adapt</h3>
    {variations}
    {mem}
    <h3>Pitfalls & Edge Cases</h3>
    <div class="pitfall-box"><ul>{pit}</ul></div>
    <h3>Where You'll See This on LeetCode</h3>
    <p>{where}</p>
    <h3>Practice Problems — Prove You Internalized This Pattern</h3>
    <p>Do these <strong>without</strong> looking at templates first. Adapt the memorized skeleton to each twist.</p>
    {problems}
  </section>'''

SECTIONS = []

# ========== 1. HASH MAP / SET ==========
SECTIONS.append(section(
    "hash-map", 1, "Hash Map / Set",
    [
        "Need O(1) lookup: \"have I seen this value/index before?\"",
        "Count frequencies of elements or characters",
        "Group or bucket items by a derived key (sorted string, modulo, etc.)",
        "Find complement: target - current, or pair that satisfies a condition",
        "Detect duplicates or check membership in O(1) per query",
    ],
    """<p>A <strong>hash map</strong> (dict in Python) stores key→value pairs with average O(1) insert and lookup via a hash function + collision handling (chaining or open addressing). A <strong>hash set</strong> is a map with no meaningful value — pure membership testing.</p>
    <p><strong>How hashing works:</strong> <code>hash(key) % bucket_count</code> gives a bucket index. Collisions occur when two keys land in the same bucket; Python resolves via open addressing. Average case O(1); worst case O(n) if all keys collide (rare with good hash).</p>
    <p><strong>Core operations to memorize:</strong> <code>dict.get(k, default)</code>, <code>dict.setdefault(k, default)</code>, <code>collections.Counter</code>, <code>collections.defaultdict</code>.</p>""",
    """<p>The brute force for \"find two elements satisfying X\" is O(n²) checking all pairs. A hash map reduces this to O(n) by storing what you've already seen and asking \"does the complement exist?\" in O(1) per step.</p>
    <p>Compared to sorting first (O(n log n)), hashing wins when you need <em>exact</em> value lookup, not order. Sorting wins when the problem needs two-pointer on sorted data. Choose hash map when the question is about existence, frequency, or grouping — not ordering.</p>""",
    """<p><strong>Typical:</strong> O(n) time, O(n) space for single-pass complement/frequency patterns.</p>
    <p><strong>Counter:</strong> O(n) to build, O(1) per query.</p>
    <p><strong>Trade-off:</strong> You pay O(n) extra space to buy O(n) time improvement over brute force.</p>""",
    tmpl("Template A — Complement / Two Sum pattern", '''
def two_sum(nums, target):
    seen = {}  # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []
''') + tmpl("Template B — Frequency counting", '''
from collections import Counter

def can_construct(ransomNote, magazine):
    freq = Counter(magazine)
    for ch in ransomNote:
        if freq[ch] <= 0:
            return False
        freq[ch] -= 1
    return True
''') + tmpl("Template C — Grouping by canonical key", '''
from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))  # or count signature: tuple(Counter(s).values())
        groups[key].append(s)
    return list(groups.values())
''') + tmpl("Template D — Hash set for duplicate / cycle detection in sequence", '''
def contains_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False
''') + tmpl("Template E — Prefix sum + hash map (subarray sum K)", '''
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    freq = {0: 1}  # prefix_sum -> count
    for x in nums:
        prefix += x
        count += freq.get(prefix - k, 0)
        freq[prefix] = freq.get(prefix, 0) + 1
    return count
'''),
    """<ul>
    <li><strong>Complement:</strong> Store value→index when you need to return indices; store value→bool when you only need existence.</li>
    <li><strong>Grouping key:</strong> Anagrams → sorted tuple or 26-char count tuple. Coordinates → (x//k, y//k).</li>
    <li><strong>Prefix + map:</strong> When subarray sum/product condition → store running aggregate, query (current - k).</li>
    <li><strong>Two maps:</strong> Compare frequency of two strings char-by-char.</li>
    </ul>""",
    [
        "Forgetting to initialize <code>{0: 1}</code> in prefix-sum counting problems.",
        "Using list as dict key (must use tuple).",
        "Off-by-one: storing index after vs before check matters for \"use each element once\" problems.",
        "Negative numbers in prefix sum — hash map still works; don't assume non-negative.",
    ],
    "Tagged <em>Array, String, Hash Table</em>. Appears in ~25% of all LeetCode mediums. Foundation for sliding window + prefix sum hybrids.",
    prob("1. Two Sum", "Easy", "Return indices of two numbers that add to target.", "As you scan, ask: have I seen (target - nums[i])?", "Template A verbatim.") +
    prob("49. Group Anagrams", "Medium", "Group strings that are anagrams.", "What canonical key represents an anagram class?", "Template C with sorted tuple or char-count key.") +
    prob("128. Longest Consecutive Sequence", "Medium", "Longest consecutive elements sequence in unsorted array. O(n) required.", "Put all nums in a set. Only start counting from sequence beginnings.", "Set for O(1) lookup; start DFS/count only if x-1 not in set.") +
    prob("560. Subarray Sum Equals K", "Medium", "Count subarrays with sum exactly k (includes negatives).", "Prefix sum + how many earlier prefixes equal (current - k).", "Template E — classic prefix+hash map."),
    walkthrough="<p><strong>Two Sum</strong> on [2,7,11,15], target=9: i=0,x=2,need=7, seen empty → seen={2:0}. i=1,x=7,need=2, 2 in seen → [0,1]. One pass O(n).</p>",
    memory="seen={}; for i,x: need=target-x; if need in seen: return; seen[x]=i | Prefix: freq={0:1}; count+=freq[prefix-k]"
))

# ========== 2. TWO POINTERS ==========
SECTIONS.append(section(
    "two-pointers", 2, "Two Pointers",
    [
        "Sorted array — find pair/triplet with sum condition",
        "Compare elements from both ends (palindrome, max area)",
        "Merge two sorted arrays/lists in-place or into result",
        "Remove duplicates in-place from sorted array",
        "Partition array around a pivot (Dutch flag)",
    ],
    """<p>Two pointers maintain indices <code>left</code> and <code>right</code> (or <code>slow</code> and <code>fast</code>) and move them based on a rule, often eliminating O(n²) nested loops.</p>
    <p><strong>Types:</strong></p>
    <ul>
    <li><strong>Opposite ends (converging):</strong> Start left=0, right=n-1, move inward. Requires sorted order or monotonic structure.</li>
    <li><strong>Same direction (writer/reader):</strong> Slow tracks write position, fast scans. Used for in-place removal.</li>
    <li><strong>Fixed offset:</strong> Two pointers separated by k or on two different arrays.</li>
    </ul>""",
    """<p>On a sorted array, if sum is too small, increment left (need bigger); if too big, decrement right. Each pointer moves at most n times → O(n) total. Without sorting, you'd check O(n²) pairs.</p>
    <p>Two pointers exploit <strong>monotonicity</strong>: as you move a pointer, something only gets bigger or smaller, so you never need to revisit rejected pairs.</p>""",
    """<p><strong>Opposite ends on sorted array:</strong> O(n) after O(n log n) sort, or O(n) if already sorted. Space O(1) excluding output.</p>
    <p><strong>Same-direction:</strong> O(n) time, O(1) space.</p>""",
    tmpl("Template A — Opposite ends (pair sum on sorted array)", '''
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left + 1, right + 1]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []
''') + tmpl("Template B — 3Sum (sort + fix one + two pointers)", '''
def three_sum(nums):
    nums.sort()
    res = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i-1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                res.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left-1]:
                    left += 1
            elif s < 0:
                left += 1
            else:
                right -= 1
    return res
''') + tmpl("Template C — In-place duplicate removal (slow/fast)", '''
def remove_duplicates(nums):
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[read - 1]:
            nums[write] = nums[read]
            write += 1
    return write
''') + tmpl("Template D — Container / max area (move shorter side)", '''
def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        w = right - left
        h = min(height[left], height[right])
        best = max(best, w * h)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
''') + tmpl("Template E — Valid palindrome (skip non-alnum)", '''
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
'''),
    """<ul>
    <li><strong>3Sum/4Sum:</strong> Fix outer index(es), two-pointer inner. Always skip duplicates after finding answer.</li>
    <li><strong>Merge sorted arrays:</strong> Pointer per array, compare and advance smaller.</li>
    <li><strong>Trapping rain water:</strong> Two pointers with left_max/right_max — move shorter side.</li>
    </ul>""",
    ["Forgetting to sort before opposite-end technique.", "Not skipping duplicate values in k-sum problems.", "Moving wrong pointer in container problem — always move the shorter height.", "Infinite loop: ensure left/right always advance."],
    "Array, Two Pointers tag. Classic interview pattern for sorted-array pair problems and in-place modification.",
    prob("125. Valid Palindrome", "Easy", "Check if string is palindrome after removing non-alphanumeric.", "Opposite ends, skip junk chars.", "Template E.") +
    prob("15. 3Sum", "Medium", "All unique triplets summing to zero.", "Sort, fix i, two-pointer for complement.", "Template B with duplicate skip.") +
    prob("11. Container With Most Water", "Medium", "Max area between two vertical lines.", "Greedy: moving shorter line is the only move that can improve.", "Template D.") +
    prob("42. Trapping Rain Water", "Hard", "Total water trapped between bars.", "Two pointers + track max from each side; process shorter side.", "Variant of converging pointers with running maxes.")
))

# ========== 3. SLIDING WINDOW ==========
SECTIONS.append(section(
    "sliding-window", 3, "Sliding Window",
    [
        "Contiguous subarray/substring optimization or validity",
        "\"Longest/shortest subarray where condition holds\"",
        "At most K distinct / exactly K distinct / all unique characters",
        "Fixed-size window of size K",
        "Problem mentions \"consecutive\" elements or substring",
    ],
    """<p>Sliding window maintains a <strong>[left, right]</strong> range representing a contiguous segment. Expand <code>right</code> to grow, shrink <code>left</code> when invalid. Each element enters and leaves at most once → O(n).</p>
    <p><strong>Fixed window:</strong> Size k always; slide by incrementing both pointers together.</p>
    <p><strong>Variable window:</strong> Expand until invalid, then shrink until valid again. Track best during valid states.</p>
    <p><strong>State tracking:</strong> Use dict/Counter for char frequencies, or integer counters for \"number of violations.\"</p>""",
    """<p>Brute force checks all O(n²) subarrays. Sliding window amortizes work because when you move left forward, you don't recompute the whole window — you update incrementally.</p>
    <p>This requires the validity condition to be <strong>monotonic</strong>: if window [l,r] is invalid, [l,r+1] might become valid but [l-1,r] won't help — so you never move left backward. That's what makes the technique O(n).</p>""",
    """<p><strong>Variable/fixed window:</strong> O(n) time — each index visited at most twice. O(k) or O(alphabet) space for frequency map.</p>""",
    tmpl("Template A — Variable window (longest valid substring)", '''
def length_of_longest_substring(s):
    last = {}  # char -> index
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best
''') + tmpl("Template B — Shrink while invalid (at most K distinct)", '''
def longest_k_distinct(s, k):
    freq = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        freq[ch] = freq.get(ch, 0) + 1
        while len(freq) > k:
            freq[s[left]] -= 1
            if freq[s[left]] == 0:
                del freq[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best
''') + tmpl("Template C — Fixed window size k", '''
def max_sum_subarray_k(nums, k):
    window_sum = sum(nums[:k])
    best = window_sum
    for right in range(k, len(nums)):
        window_sum += nums[right] - nums[right - k]
        best = max(best, window_sum)
    return best
''') + tmpl("Template D — Minimum window substring", '''
from collections import Counter

def min_window(s, t):
    need = Counter(t)
    missing = len(t)
    left = 0
    best = (0, float('inf'))
    for right, ch in enumerate(s):
        if ch in need:
            if need[ch] > 0:
                missing -= 1
            need[ch] -= 1
        while missing == 0:
            if right - left + 1 < best[1] - best[0] + 1:
                best = (left, right)
            if s[left] in need:
                need[s[left]] += 1
                if need[s[left]] > 0:
                    missing += 1
            left += 1
    l, r = best
    return "" if r == float('inf') else s[l:r+1]
''') + tmpl("Template E — Sliding window on counts (permutation in string)", '''
def check_inclusion(s1, s2):
    if len(s1) > len(s2):
        return False
    need = [0] * 26
    have = [0] * 26
    for c in s1:
        need[ord(c) - ord('a')] += 1
    k = len(s1)
    for i, c in enumerate(s2):
        have[ord(c) - ord('a')] += 1
        if i >= k:
            have[ord(s2[i - k]) - ord('a')] -= 1
        if have == need:
            return True
    return False
'''),
    """<ul><li><strong>Longest vs shortest:</strong> Update best on valid (longest) or when becoming invalid after valid (shortest).</li>
    <li><strong>Exactly K:</strong> atMost(K) - atMost(K-1).</li>
    <li><strong>Numeric window:</strong> Same templates on arrays (max sum, binary subarrays).</li></ul>""",
    ["Using sliding window when elements aren't contiguous.", "Forgetting to shrink — infinite expand.", "Off-by-one on window size.", "Not resetting state when left moves."],
    "String/Array — substring/subarray problems. Often combined with hash map for character counts.",
    prob("3. Longest Substring Without Repeating Characters", "Medium", "Length of longest substring with all unique chars.", "Jump left past last occurrence of current char.", "Template A.") +
    prob("76. Minimum Window Substring", "Hard", "Smallest substring of s containing all chars of t.", "Expand until valid, shrink to minimize.", "Template D.") +
    prob("567. Permutation in String", "Medium", "Does s2 contain a permutation of s1?", "Fixed window of len(s1), compare frequency arrays.", "Template E.") +
    prob("904. Fruit Into Baskets", "Medium", "Longest subarray with at most 2 distinct values.", "At-most-K distinct with K=2.", "Template B.")
))

# ========== 4. PREFIX SUM ==========
SECTIONS.append(section(
    "prefix-sum", 4, "Prefix Sum",
    [
        "Range sum query: sum(i, j) many times",
        "Subarray sum equals K (count or existence)",
        "Equilibrium index / split point",
        "2D matrix region sum",
        "Transform subarray condition into prefix difference",
    ],
    """<p><strong>Prefix sum</strong> array <code>P</code> where <code>P[i] = nums[0] + ... + nums[i]</code>. Range sum <code>sum(l, r) = P[r] - P[l-1]</code> in O(1).</p>
    <p><strong>Key insight:</strong> Sum of subarray (i, j] = prefix[j] - prefix[i]. If prefix[j] - prefix[i] = k, then prefix[i] = prefix[j] - k.</p>
    <p><strong>2D prefix:</strong> <code>P[r][c] = sum of rectangle (0,0) to (r,c)</code>. Rectangle query in O(1) using inclusion-exclusion.</p>""",
    """<p>Naive range sum is O(n) per query. Prefix sum preprocesses in O(n) for O(1) queries — essential when queries are many.</p>
    <p>Combined with hash map, converts \"count subarrays with sum k\" from O(n²) to O(n) because each prefix has one value and you count matching earlier prefixes.</p>""",
    """<p><strong>Build prefix:</strong> O(n) time, O(n) space.</p>
    <p><strong>Query:</strong> O(1).</p>
    <p><strong>Subarray sum K with hash map:</strong> O(n) time, O(n) space.</p>""",
    tmpl("Template A — 1D prefix sum build + range query", '''
def build_prefix(nums):
    P = [0]
    for x in nums:
        P.append(P[-1] + x)
    return P

def range_sum(P, l, r):  # inclusive l, r — nums indices
    return P[r + 1] - P[l]
''') + tmpl("Template B — Subarray sum equals K (count)", '''
def subarray_sum(nums, k):
    count = 0
    prefix = 0
    freq = {0: 1}
    for x in nums:
        prefix += x
        count += freq.get(prefix - k, 0)
        freq[prefix] = freq.get(prefix, 0) + 1
    return count
''') + tmpl("Template C — Product except self (prefix + suffix)", '''
def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    prefix = 1
    for i in range(n):
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out
''') + tmpl("Template D — 2D prefix sum", '''
def build_2d_prefix(matrix):
    if not matrix:
        return [[]]
    R, C = len(matrix), len(matrix[0])
    P = [[0] * (C + 1) for _ in range(R + 1)]
    for r in range(R):
        for c in range(C):
            P[r+1][c+1] = matrix[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]
    return P

def rect_sum(P, r1, c1, r2, c2):  # inclusive corners
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]
'''),
    """<ul><li><strong>Prefix XOR:</strong> Same logic for subarray XOR — use hash map with prefix XOR.</li>
    <li><strong>Modulo prefix:</strong> (prefix[j] - prefix[i]) % k == 0 ↔ same remainder mod k.</li>
    <li><strong>Difference array:</strong> Inverse of prefix sum for range updates.</li></ul>""",
    ["Forgetting P[0]=0 or {0:1} initialization.", "Confusing inclusive/exclusive index in P[r+1]-P[l].", "2D inclusion-exclusion sign errors."],
    "Range queries, subarray sum problems, matrix region sums. Often paired with hash map.",
    prob("303. Range Sum Query - Immutable", "Easy", "Multiple range sum queries on static array.", "Precompute prefix once.", "Template A.") +
    prob("560. Subarray Sum Equals K", "Medium", "Count subarrays summing to k.", "prefix - k lookup in hash map.", "Template B.") +
    prob("238. Product of Array Except Self", "Medium", "Output[i] = product of all except nums[i]. No division.", "Prefix products from left, suffix from right.", "Template C.") +
    prob("304. Range Sum Query 2D", "Medium", "Sum of elements inside rectangle queries.", "2D prefix + inclusion-exclusion.", "Template D.")
))

# ========== 5. BINARY SEARCH ==========
SECTIONS.append(section(
    "binary-search", 5, "Binary Search (Including \"Binary Search on Answer\")",
    [
        "Sorted array — find target or insertion point",
        "\"Minimize the maximum\" / \"maximize the minimum\"",
        "Can you verify an answer in O(n) and monotonic feasibility?",
        "Search space is numeric range or index range",
        "Rotated sorted array, first/last occurrence",
    ],
    """<p><strong>Classic BS:</strong> Halve search space using compare with mid. Requires monotonic ordering.</p>
    <p><strong>Binary search on answer:</strong> Don't search indices — search the <em>answer space</em> (e.g., speed, capacity). If <code>feasible(x)</code> is monotonic (false...false,true...true), BS finds minimum x where feasible is true.</p>
    <p><strong>Loop invariant:</strong> Maintain [lo, hi] such that answer is always inside. Use <code>while lo &lt; hi</code> with <code>mid = lo + (hi-lo)//2</code> to avoid overflow.</p>""",
    """<p>Linear scan O(n) vs BS O(log n) on sorted data. For answer-space BS, if checking feasibility is O(n), total is O(n log R) where R is answer range — beats trying all answers O(n·R).</p>
    <p>The professor's rule: <strong>if you can write check(x) and feasibility is monotonic, BS the answer.</strong></p>""",
    """<p><strong>Classic:</strong> O(log n) time, O(1) space.</p>
    <p><strong>On answer:</strong> O(n log R) where R = hi - lo.</p>""",
    tmpl("Template A — Classic binary search (find target)", '''
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
''') + tmpl("Template B — Lower bound (first index >= target)", '''
def lower_bound(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
''') + tmpl("Template C — Binary search on answer", '''
def min_feasible(lo, hi):
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

# Example: Koko eating bananas
def min_eating_speed(piles, h):
    def feasible(speed):
        hours = sum((p + speed - 1) // speed for p in piles)
        return hours <= h
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
''') + tmpl("Template D — Rotated sorted array", '''
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # left half sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # right half sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
'''),
    """<ul><li><strong>Min vs max:</strong> Min feasible → BS left; max feasible → BS right variant.</li>
    <li><strong>On index:</strong> Peak finding, split array where condition changes.</li>
    <li><strong>Floating BS:</strong> while hi-lo > eps for precision problems.</li></ul>""",
    ["Using BS on unsorted data without monotonic check(x).", "Off-by-one with lo<hi vs lo<=hi.", "Integer overflow in mid (use lo+(hi-lo)//2).", "Confusing min-answer vs max-answer BS direction."],
    "Binary Search tag, also hidden in greedy-feasibility problems (Koko, ship capacity, split array).",
    prob("704. Binary Search", "Easy", "Standard search in sorted array.", "Classic template.", "Template A.") +
    prob("875. Koko Eating Bananas", "Medium", "Min eating speed to finish in h hours.", "BS on speed; check total hours.", "Template C.") +
    prob("1011. Capacity To Ship Packages Within D Days", "Medium", "Min ship capacity for d days.", "BS on capacity; greedy check if load fits.", "Template C with greedy feasible.") +
    prob("33. Search in Rotated Sorted Array", "Medium", "Find target in rotated array O(log n).", "Identify sorted half each step.", "Template D.")
))

# ========== 6. STACK ==========
SECTIONS.append(section(
    "stack", 6, "Stack (Including Monotonic Stack)",
    ["Matching brackets / nested structure", "Next greater / next smaller element", "Process elements in LIFO order", "Histogram / rectangle area problems", "Evaluate expressions (RPN)"],
    """<p>Stack: LIFO. Push/pop O(1). Used when <strong>most recent unmatched element</strong> matters.</p>
    <p><strong>Monotonic stack:</strong> Maintains increasing or decreasing order. When a new element violates order, pop until restored — each element pushed/popped once → O(n).</p>
    <p><strong>Classic use:</strong> For each index, find next greater element to the right in O(n) total.</p>""",
    """<p>Brute force next-greater is O(n²). Monotonic stack processes each element once — O(n). Stack beats recursion when you need explicit control over DFS-like backtracking on arrays.</p>""",
    """<p><strong>Stack operations:</strong> O(n) time, O(n) space worst case.</p>
    <p><strong>Monotonic stack:</strong> O(n) — amortized one push/pop per element.</p>""",
    tmpl("Template A — Valid parentheses", '''
def is_valid(s):
    stack = []
    match = {')': '(', ']': '[', '}': '{'}
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        else:
            if not stack or stack[-1] != match[ch]:
                return False
            stack.pop()
    return not stack
''') + tmpl("Template B — Monotonic stack (next greater element)", '''
def next_greater(nums):
    res = [-1] * len(nums)
    stack = []  # indices, decreasing values
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            j = stack.pop()
            res[j] = x
        stack.append(i)
    return res
''') + tmpl("Template C — Daily temperatures style", '''
def daily_temperatures(temps):
    res = [0] * len(temps)
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res
''') + tmpl("Template D — Largest rectangle in histogram", '''
def largest_rectangle(heights):
    stack = []
    best = 0
    heights = heights + [0]  # sentinel
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            idx = stack.pop()
            w = i if not stack else i - stack[-1] - 1
            best = max(best, heights[idx] * w)
        stack.append(i)
    return best
''') + tmpl("Template E — Evaluate RPN", '''
def eval_rpn(tokens):
    stack = []
    ops = {'+', '-', '*', '/'}
    for t in tokens:
        if t not in ops:
            stack.append(int(t))
        else:
            b, a = stack.pop(), stack.pop()
            if t == '+': stack.append(a + b)
            elif t == '-': stack.append(a - b)
            elif t == '*': stack.append(a * b)
            else: stack.append(int(a / b))
    return stack[0]
'''),
    """<ul><li><strong>Monotonic increasing vs decreasing:</strong> Next greater → decreasing stack; next smaller → increasing.</li>
    <li><strong>Store indices not values</strong> when width matters.</li></ul>""",
    ["Empty stack pop.", "Forgetting sentinel in histogram.", "Wrong monotonic direction."],
    "Stack tag, monotonic stack for array-neighbor problems.",
    prob("20. Valid Parentheses", "Easy", "Match brackets correctly.", "Push opens, pop on close.", "Template A.") +
    prob("739. Daily Temperatures", "Medium", "Days until warmer temperature.", "Monotonic decreasing stack of indices.", "Template C.") +
    prob("84. Largest Rectangle in Histogram", "Hard", "Max rectangle area in histogram.", "Monotonic stack + sentinel.", "Template D.") +
    prob("150. Evaluate Reverse Polish Notation", "Medium", "Evaluate postfix expression.", "Stack for operands.", "Template E.")
))

# ========== 7. HEAP ==========
SECTIONS.append(section(
    "heap", 7, "Heap / Priority Queue",
    ["Top K / Kth largest / Kth smallest", "Merge K sorted lists/streams", "Continuous median", "Schedule tasks by priority or deadline", "Dijkstra (min-heap on distance)"],
    """<p><strong>Binary heap:</strong> Complete binary tree with heap property. Min-heap: parent ≤ children. Insert/extract O(log n), peek O(1). Python: <code>heapq</code> is min-heap only.</p>
    <p><strong>Max-heap trick:</strong> Push negated values. <strong>K largest:</strong> maintain min-heap of size K.</p>""",
    """<p>Sorting entire array O(n log n) to get Kth element is wasteful. Min-heap of size K is O(n log K). For merging K sorted lists, heap always picks smallest among K heads — O(N log K).</p>""",
    """<p><strong>Heap ops:</strong> O(log n) insert/extract.</p>
    <p><strong>Top K:</strong> O(n log k) time, O(k) space.</p>
    <p><strong>Merge K lists:</strong> O(N log K).</p>""",
    tmpl("Template A — Kth largest (min-heap size k)", '''
import heapq

def find_kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
''') + tmpl("Template B — Top K frequent", '''
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    freq = Counter(nums)
    return [x for x, _ in heapq.nlargest(k, freq.items(), key=lambda p: p[1])]
''') + tmpl("Template C — Merge K sorted lists", '''
import heapq

def merge_k_lists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = tail = ListNode(0)
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = tail.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next
''') + tmpl("Template D — Two heaps for median", '''
import heapq

class MedianFinder:
    def __init__(self):
        self.lo = []  # max-heap via negation
        self.hi = []  # min-heap
    def addNum(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def findMedian(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2
''') + tmpl("Template E — Task scheduler / greedy with heap", '''
import heapq
from collections import Counter

def least_interval(tasks, n):
    freq = Counter(tasks)
    heap = [-cnt for cnt in freq.values()]
    heapq.heapify(heap)
    time = 0
    while heap:
        cycle = []
        for _ in range(n + 1):
            if heap:
                cycle.append(heapq.heappop(heap))
        for cnt in cycle:
            if cnt + 1 < 0:
                heapq.heappush(heap, cnt + 1)
        time += n + 1 if heap else len(cycle)
    return time
'''),
    """<ul><li><strong>K closest points:</strong> heap of (-dist, point) or nlargest.</li>
    <li><strong>Custom comparator:</strong> push tuples (priority, item).</li></ul>""",
    ["Forgetting heapq is min-heap.", "Not re-heapifying after building list.", "Pushing None nodes in merge K lists."],
    "Heap tag, Top K problems, streaming median, scheduling.",
    prob("215. Kth Largest Element in an Array", "Medium", "Find kth largest.", "Min-heap size k.", "Template A.") +
    prob("347. Top K Frequent Elements", "Medium", "K most frequent numbers.", "Counter + nlargest or heap.", "Template B.") +
    prob("23. Merge k Sorted Lists", "Hard", "Merge K linked lists.", "Heap of list heads.", "Template C.") +
    prob("295. Find Median from Data Stream", "Hard", "Median after each insert.", "Two heaps balanced.", "Template D.")
))

# ========== 8. BFS / DFS ==========
SECTIONS.append(section(
    "bfs-dfs", 8, "BFS / DFS (Trees + Graphs)",
    ["Grid/graph traversal — islands, connected components", "Shortest path in unweighted graph → BFS", "Explore all paths / exhaust possibilities → DFS", "Tree problems — recursive structure", "Clone/copy graph or tree"],
    """<p><strong>DFS:</strong> Go deep first (stack or recursion). Explores all reachable nodes. O(V+E).</p>
    <p><strong>BFS:</strong> Level-by-level (queue). Finds shortest path in unweighted graphs. O(V+E).</p>
    <p><strong>Tree DFS:</strong> Preorder/inorder/postorder — often returns info from subtrees upward.</p>
    <p><strong>Visited set:</strong> Prevent cycles in graphs. Mark on push (BFS) or on entry (DFS).</p>""",
    """<p>DFS uses less memory on deep sparse graphs; BFS guarantees shortest steps in unweighted setting. Both beat naive \"try every path\" exponential search.</p>
    <p>Professor tip: <strong>shortest path unweighted = BFS; explore all / backtrack = DFS; tree recursion = DFS with base case on null node.</strong></p>""",
    """<p><strong>Both:</strong> O(V + E) time, O(V) space for visited + queue/stack.</p>
    <p><strong>Grid as graph:</strong> V = R×C, E ≈ 4V.</p>""",
    tmpl("Template A — Grid DFS (count islands)", '''
def num_islands(grid):
    if not grid:
        return 0
    R, C = len(grid), len(grid[0])
    def dfs(r, c):
        if r < 0 or r >= R or c < 0 or c >= C or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count
''') + tmpl("Template B — Grid BFS (shortest path)", '''
from collections import deque

def shortest_path_grid(grid):
    if not grid:
        return -1
    R, C = len(grid), len(grid[0])
    q = deque([(0, 0, 0)])
    seen = {(0, 0)}
    while q:
        r, c, d = q.popleft()
        if r == R-1 and c == C-1:
            return d
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 0 and (nr,nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc, d+1))
    return -1
''') + tmpl("Template C — Graph DFS (adjacency list)", '''
def dfs_graph(node, visited):
    visited.add(node)
    for nei in node.neighbors:
        if nei not in visited:
            dfs_graph(nei, visited)
''') + tmpl("Template D — Tree recursion (max depth)", '''
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
''') + tmpl("Template E — Multi-source BFS", '''
from collections import deque

def oranges_rotting(grid):
    q = deque()
    fresh = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == 2:
                q.append((r, c, 0))
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while q:
        r, c, t = q.popleft()
        minutes = max(minutes, t)
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t+1))
    return minutes if fresh == 0 else -1
'''),
    """<ul><li><strong>Iterative DFS:</strong> explicit stack.</li>
    <li><strong>0-1 BFS:</strong> deque for weights 0/1.</li>
    <li><strong>Tree return values:</strong> combine left/right subtree answers.</li></ul>""",
    ["Mutating grid without restoring (OK if counting only).", "Not marking visited before enqueue (BFS duplicates).", "Recursion depth on huge grids — use iterative."],
    "Graph, Tree, Matrix tags — most common medium/hard category.",
    prob("200. Number of Islands", "Medium", "Count connected '1' regions.", "DFS/BFS flood fill.", "Template A.") +
    prob("695. Max Area of Island", "Medium", "Largest island area.", "DFS return cell count.", "Template A variant returning size.") +
    prob("133. Clone Graph", "Medium", "Deep copy undirected graph.", "DFS/BFS + hash old→new node.", "Template C with memo dict.") +
    prob("127. Word Ladder", "Hard", "Shortest transformation sequence.", "BFS on word graph.", "Template B on implicit graph.")
))

# ========== 9. BACKTRACKING ==========
SECTIONS.append(section(
    "backtracking", 9, "Backtracking / Subsets / Permutations",
    ["Generate all subsets, permutations, combinations", "\"Find all solutions\" with constraints", "Place queens / sudoku / board search", "Can include/skip each element (decision tree)", "Prune branches that violate constraints early"],
    """<p>Backtracking = DFS on a <strong>decision tree</strong>. At each step, make a choice, recurse, then <strong>undo</strong> (backtrack) to try other choices.</p>
    <p><strong>Structure:</strong> base case (save solution) → loop choices → apply choice → recurse → remove choice.</p>
    <p>Same as exhaustive search but with pruning when partial state can't lead to valid solution.</p>""",
    """<p>Brute force generates all then filters — backtracking prunes early. For subsets of n elements, still O(2^n) but with much smaller constant and less memory waste.</p>""",
    """<p><strong>Subsets:</strong> O(2^n) time and output space.</p>
    <p><strong>Permutations:</strong> O(n!)</p>
    <p><strong>With pruning:</strong> reduces practical runtime significantly.</p>""",
    tmpl("Template A — Subsets", '''
def subsets(nums):
    res = []
    path = []
    def dfs(i):
        if i == len(nums):
            res.append(path[:])
            return
        dfs(i + 1)  # skip
        path.append(nums[i])
        dfs(i + 1)  # take
        path.pop()
    dfs(0)
    return res
''') + tmpl("Template B — Permutations", '''
def permute(nums):
    res = []
    used = [False] * len(nums)
    path = []
    def dfs():
        if len(path) == len(nums):
            res.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            dfs()
            path.pop()
            used[i] = False
    dfs()
    return res
''') + tmpl("Template C — Combination sum (reuse allowed)", '''
def combination_sum(candidates, target):
    res = []
    path = []
    def dfs(start, remaining):
        if remaining == 0:
            res.append(path[:])
            return
        if remaining < 0:
            return
        for i in range(start, len(candidates)):
            path.append(candidates[i])
            dfs(i, remaining - candidates[i])  # i not i+1 if reuse
            path.pop()
    dfs(0, target)
    return res
''') + tmpl("Template D — N-Queens", '''
def solve_n_queens(n):
    res = []
    cols = set(); diag1 = set(); diag2 = set()
    board = [['.'] * n for _ in range(n)]
    def dfs(r):
        if r == n:
            res.append([''.join(row) for row in board])
            return
        for c in range(n):
            if c in cols or (r-c) in diag1 or (r+c) in diag2:
                continue
            cols.add(c); diag1.add(r-c); diag2.add(r+c)
            board[r][c] = 'Q'
            dfs(r + 1)
            board[r][c] = '.'
            cols.remove(c); diag1.remove(r-c); diag2.remove(r+c)
    dfs(0)
    return res
'''),
    """<ul><li><strong>Combinations C(n,k):</strong> dfs(i) only forward to avoid duplicates.</li>
    <li><strong>Duplicates in input:</strong> sort + skip same value at same depth.</li></ul>""",
    ["Forgetting path[:] when appending.", "Not undoing state after recurse.", "Duplicate combinations — use start index."],
    "Backtracking tag — subsets, permutations, combinatorial search.",
    prob("78. Subsets", "Medium", "All subsets.", "Include/exclude DFS.", "Template A.") +
    prob("46. Permutations", "Medium", "All permutations.", "used[] array.", "Template B.") +
    prob("39. Combination Sum", "Medium", "Combinations summing to target, reuse ok.", "Start index, reuse same i.", "Template C.") +
    prob("51. N-Queens", "Hard", "Place n queens safely.", "Track cols and diagonals.", "Template D.")
))

# ========== 10. UNION-FIND ==========
SECTIONS.append(section(
    "union-find", 10, "Union-Find (Disjoint Set Union)",
    ["Dynamic connectivity — are A and B connected?", "Count connected components as edges arrive", "Detect cycle in undirected graph", "Group items that should merge (accounts, redundant connections)", "Offline connectivity queries"],
    """<p><strong>Union-Find</strong> maintains disjoint sets with:</p>
    <ul><li><code>find(x)</code> — representative of x's set (with path compression)</li>
    <li><code>union(a,b)</code> — merge sets (with union by rank/size)</li></ul>
    <p>Amortized nearly O(1) per operation (inverse Ackermann α(n)).</p>""",
    """<p>DFS/BFS recomputes components each query O(V+E). Union-Find handles incremental merges efficiently — ideal for Kruskal MST, connectivity streams, detecting redundant edges.</p>""",
    """<p><strong>With path compression + union by rank:</strong> O(α(n)) ≈ O(1) amortized per op.</p>
    <p><strong>Space:</strong> O(n) parent array.</p>""",
    tmpl("Template A — Union-Find class", '''
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True
''') + tmpl("Template B — Count components", '''
def count_components(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.components
''') + tmpl("Template C — Detect cycle (undirected)", '''
def has_cycle(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        if not uf.union(u, v):  # already connected
            return True
    return False
''') + tmpl("Template D — Graph valid tree", '''
def valid_tree(n, edges):
    if len(edges) != n - 1:
        return False
    uf = UnionFind(n)
    for u, v in edges:
        if not uf.union(u, v):
            return False
    return True
'''),
    """<ul><li><strong>Map node labels:</strong> str→int hash before UF.</li>
    <li><strong>Track set sizes:</strong> for largest component problems.</li></ul>""",
    ["Forgetting path compression.", "Off-by-one on node count.", "Using UF on directed graphs without adaptation."],
    "Graph connectivity, redundant connection, accounts merge.",
    prob("323. Number of Connected Components in an Undirected Graph", "Medium", "Count components.", "Union each edge.", "Template B.") +
    prob("261. Graph Valid Tree", "Medium", "n nodes, n-1 edges, no cycle.", "UF + edge count check.", "Template D.") +
    prob("684. Redundant Connection", "Medium", "First edge that creates cycle.", "Return edge where union fails.", "Template C.") +
    prob("721. Accounts Merge", "Medium", "Merge accounts sharing emails.", "UF on email indices.", "Template A with label mapping.")
))

# ========== 11. TOPOLOGICAL SORT ==========
SECTIONS.append(section(
    "topo-sort", 11, "Topological Sort",
    ["Directed graph with prerequisites / dependencies", "Course schedule — can you finish?", "Ordering tasks with constraints", "Detect cycle in directed graph", "Build order from dependencies"],
    """<p><strong>Topological order:</strong> Linear ordering of DAG vertices so all edges go forward. Impossible if cycle exists.</p>
    <p><strong>Kahn's (BFS):</strong> Start with nodes of in-degree 0, remove, decrease neighbors' in-degree.</p>
    <p><strong>DFS:</strong> Post-order stack — add node after visiting all descendants; reverse for topo order.</p>""",
    """<p>Topo sort answers \"is there a valid order?\" and \"give me one order\" in O(V+E). BFS Kahn's is intuitive for course schedule; DFS detects cycles via recursion stack.</p>""",
    """<p><strong>Kahn/DFS:</strong> O(V + E) time, O(V) space.</p>""",
    tmpl("Template A — Kahn's algorithm", '''
from collections import deque, defaultdict

def topo_sort_kahn(n, edges):
    graph = defaultdict(list)
    indeg = [0] * n
    for u, v in edges:
        graph[u].append(v)
        indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []  # empty if cycle
''') + tmpl("Template B — Course schedule (can finish?)", '''
def can_finish(numCourses, prerequisites):
    return len(topo_sort_kahn(numCourses, prerequisites)) == numCourses
''') + tmpl("Template C — DFS cycle detection + topo", '''
def topo_sort_dfs(n, edges):
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
    state = [0] * n  # 0=unvisited, 1=visiting, 2=done
    order = []
    def dfs(u):
        state[u] = 1
        for v in graph[u]:
            if state[v] == 1:
                return False
            if state[v] == 0 and not dfs(v):
                return False
        state[u] = 2
        order.append(u)
        return True
    for i in range(n):
        if state[i] == 0 and not dfs(i):
            return []
    return order[::-1]
'''),
    """<ul><li><strong>Course schedule II:</strong> return order or [].</li>
    <li><strong>Alien dictionary:</strong> build graph from adjacent word pairs.</li></ul>""",
    ["Not detecting cycle — partial order returned.", "Wrong indegree initialization.", "Multiple components — handle all nodes."],
    "Graph, topo sort tag — scheduling, prerequisites.",
    prob("207. Course Schedule", "Medium", "Can finish all courses?", "Kahn's — cycle if order length < n.", "Template B.") +
    prob("210. Course Schedule II", "Medium", "Return valid order.", "Kahn's return order.", "Template A.") +
    prob("269. Alien Dictionary", "Hard", "Derive char order from sorted dictionary.", "Build edges from adjacent words.", "Template A on char graph.") +
    prob("802. Find Eventual Safe States", "Medium", "Nodes that lead to terminal nodes.", "Reverse graph or DFS three-color.", "Variant of cycle detection.")
))

# ========== 12. TRIE ==========
SECTIONS.append(section(
    "trie", 12, "Trie (Prefix Tree)",
    ["Prefix search / autocomplete", "Dictionary of words — search, prefix match", "Word search on board with many words", "XOR maximum with binary trie", "Store strings for efficient prefix queries"],
    """<p><strong>Trie:</strong> Tree where each edge is a character. Path from root spells prefix. Search/insert O(L) where L = word length.</p>
    <p>Beats hash set when you need <strong>prefix queries</strong> or shared prefix compression.</p>""",
    """<p>Hash set lookup O(L) but can't answer \"all words starting with 'app'\". Trie gives O(L + num_results). For word search II with many dictionary words, trie prunes dead paths early.</p>""",
    """<p><strong>Insert/search:</strong> O(L) time, O(total chars) space.</p>""",
    tmpl("Template A — Trie node + insert/search/startsWith", '''
class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.end = True
    def search(self, word):
        node = self._walk(word)
        return node is not None and node.end
    def startsWith(self, prefix):
        return self._walk(prefix) is not None
    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
''') + tmpl("Template B — Word search II (board + trie)", '''
def find_words(board, words):
    trie = Trie()
    for w in words:
        trie.insert(w)
    res = []
    R, C = len(board), len(board[0])
    def dfs(r, c, node, path):
        ch = board[r][c]
        if ch not in node.children:
            return
        node = node.children[ch]
        path += ch
        if node.end:
            res.append(path)
            node.end = False  # avoid duplicates
        board[r][c] = '#'
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < R and 0 <= nc < C and board[nr][nc] != '#':
                dfs(nr, nc, node, path)
        board[r][c] = ch
    for r in range(R):
        for c in range(C):
            dfs(r, c, trie.root, "")
    return res
'''),
    """<ul><li><strong>Array children[26]:</strong> faster than dict for lowercase letters.</li>
    <li><strong>Bit trie:</strong> for max XOR pair problems.</li></ul>""",
    ["Not marking end of word.", "Not restoring board in backtrack.", "Duplicate words in result."],
    "Trie tag — design, word search, prefix problems.",
    prob("208. Implement Trie", "Medium", "Standard trie operations.", "Node dict + end flag.", "Template A.") +
    prob("212. Word Search II", "Hard", "Find all dictionary words on board.", "Trie + DFS backtrack.", "Template B.") +
    prob("648. Replace Words", "Medium", "Replace with shortest root prefix.", "Trie insert roots, search prefix.", "Template A search.") +
    prob("211. Design Add and Search Words Data Structure", "Medium", "Search with '.' wildcard.", "DFS on trie for wildcard.", "Template A + DFS on '.' branches.")
))

# ========== 13. INTERVALS ==========
SECTIONS.append(section(
    "intervals", 13, "Intervals (Merge, Sweep)",
    ["Overlapping intervals — merge, insert, remove", "Meeting rooms / scheduling conflicts", "Sweep line — process start/end events", "Interval partitioning / minimum resources", "Sort by start or end time first"],
    """<p>Intervals [start, end] model time ranges, meetings, etc. <strong>Sort by start</strong> for merging; <strong>sort by end</strong> for greedy scheduling (activity selection).</p>
    <p><strong>Sweep line:</strong> Convert to events (start, +1), (end, -1), sort, track active count.</p>""",
    """<p>Sorting O(n log n) then linear scan beats pairwise overlap check O(n²). Greedy on sorted end times is optimal for maximum non-overlapping intervals (proof: exchange argument).</p>""",
    """<p><strong>Merge/insert:</strong> O(n log n) from sort.</p>
    <p><strong>Sweep line:</strong> O(n log n).</p>""",
    tmpl("Template A — Merge intervals", '''
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for s, e in intervals:
        if not merged or s > merged[-1][1]:
            merged.append([s, e])
        else:
            merged[-1][1] = max(merged[-1][1], e)
    return merged
''') + tmpl("Template B — Insert interval", '''
def insert(intervals, new):
    res = []
    i = 0
    while i < len(intervals) and intervals[i][1] < new[0]:
        res.append(intervals[i]); i += 1
    while i < len(intervals) and intervals[i][0] <= new[1]:
        new = [min(new[0], intervals[i][0]), max(new[1], intervals[i][1])]
        i += 1
    res.append(new)
    res.extend(intervals[i:])
    return res
''') + tmpl("Template C — Non-overlapping intervals (min removals)", '''
def erase_overlap(intervals):
    intervals.sort(key=lambda x: x[1])
    removals = 0
    end = float('-inf')
    for s, e in intervals:
        if s >= end:
            end = e
        else:
            removals += 1
    return removals
''') + tmpl("Template D — Meeting rooms II (min rooms)", '''
import heapq

def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    heap = []  # end times
    for s, e in intervals:
        if heap and heap[0] <= s:
            heapq.heappop(heap)
        heapq.heappush(heap, e)
    return len(heap)
'''),
    """<ul><li><strong>252 meeting rooms:</strong> check overlap after sort by start.</li>
    <li><strong>435:</strong> greedy keep earliest ending.</li></ul>""",
    ["Confusing open vs closed intervals.", "Not sorting before merge.", "Wrong greedy sort key."],
    "Array, intervals tag — scheduling classics.",
    prob("56. Merge Intervals", "Medium", "Merge all overlapping.", "Sort by start, extend last.", "Template A.") +
    prob("57. Insert Interval", "Medium", "Insert and merge.", "Three-phase linear scan.", "Template B.") +
    prob("435. Non-overlapping Intervals", "Medium", "Min intervals to remove.", "Greedy by earliest end.", "Template C.") +
    prob("253. Meeting Rooms II", "Medium", "Min conference rooms needed.", "Sort + min-heap of end times.", "Template D.")
))

# ========== 14. GREEDY ==========
SECTIONS.append(section(
    "greedy", 14, "Greedy",
    ["Local optimal choice leads to global optimum (often provable)", "Activity selection / scheduling", "Jump game — can you reach end?", "Assign tasks / minimize lateness", "Proof often uses exchange argument or stays ahead"],
    """<p><strong>Greedy:</strong> At each step, pick the best-looking local option without backtracking. Works when problem has <strong>greedy choice property</strong> and <strong>optimal substructure</strong>.</p>
    <p>Unlike DP, no table — one pass or sort + pass.</p>""",
    """<p>DP explores many subproblems; greedy commits early when you can prove you won't need alternatives. O(n) or O(n log n) vs exponential or O(n²) DP states.</p>
    <p>Professor warning: <strong>greedy fails unless you can prove it</strong>. Test counterexamples mentally.</p>""",
    """<p>Usually O(n log n) from sorting, or O(n) single pass.</p>""",
    tmpl("Template A — Jump game", '''
def can_jump(nums):
    reach = 0
    for i, jump in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + jump)
    return True
''') + tmpl("Template B — Jump game II (min jumps)", '''
def jump(nums):
    jumps = 0
    cur_end = 0
    farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == cur_end:
            jumps += 1
            cur_end = farthest
    return jumps
''') + tmpl("Template C — Gas station circuit", '''
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    tank = 0
    start = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0
    return start
''') + tmpl("Template D — Partition labels", '''
def partition_labels(s):
    last = {ch: i for i, ch in enumerate(s)}
    end = 0
    size = 0
    res = []
    for i, ch in enumerate(s):
        end = max(end, last[ch])
        size += 1
        if i == end:
            res.append(size)
            size = 0
    return res
'''),
    """<ul><li><strong>Task scheduler:</strong> formula or heap.</li>
    <li><strong>Assign cookies:</strong> sort both, two pointers.</li></ul>""",
    ["Applying greedy without proof — wrong on coin change.", "Confusing jump game I vs II."],
    "Greedy tag — jump games, intervals, scheduling.",
    prob("55. Jump Game", "Medium", "Can reach last index?", "Track farthest reachable.", "Template A.") +
    prob("45. Jump Game II", "Medium", "Minimum jumps to end.", "BFS-like greedy layers.", "Template B.") +
    prob("134. Gas Station", "Medium", "Start index for circular route.", "Total gas vs cost; reset start when tank negative.", "Template C.") +
    prob("763. Partition Labels", "Medium", "Split string into max parts where letters appear in one part.", "Track last index of each char.", "Template D.")
))

# ========== 15. DP ==========
SECTIONS.append(section(
    "dp", 15, "Dynamic Programming (1D → 2D → Knapsack)",
    ["Optimal substructure — optimal solution built from subproblems", "Overlapping subproblems — reuse computed results", "Count ways / min cost / max value", "Choice at each step: take or skip", "Grid paths, sequence DP, knapsack"],
    """<p><strong>DP recipe:</strong></p>
    <ol>
    <li>Define state (what info do you need?)</li>
    <li>Recurrence (how states relate)</li>
    <li>Base cases</li>
    <li>Order of computation (bottom-up) or memo (top-down)</li>
    </ol>
    <p><strong>1D:</strong> dp[i] depends on dp[i-1], dp[i-2]...</p>
    <p><strong>2D:</strong> dp[i][j] — two sequences or grid.</p>
    <p><strong>Knapsack:</strong> dp[cap] — iterate items, cap backwards for 0/1 knapsack.</p>""",
    """<p>Naive recursion is exponential from recomputation. Memoization → O(states × transitions). Bottom-up avoids recursion limit and is often faster.</p>
    <p>DP beats greedy when local choice isn't sufficient (coin change with arbitrary denominations).</p>""",
    """<p><strong>1D DP:</strong> O(n) time, O(n) or O(1) space if rolling.</p>
    <p><strong>2D:</strong> O(mn) time/space, often optimizable.</p>
    <p><strong>Knapsack:</strong> O(n × W).</p>""",
    tmpl("Template A — 1D (climbing stairs / fib)", '''
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b
''') + tmpl("Template B — House robber (take/skip)", '''
def rob(nums):
    prev2, prev1 = 0, 0
    for x in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
''') + tmpl("Template C — Coin change (unbounded)", '''
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1
''') + tmpl("Template D — 0/1 Knapsack", '''
def knapsack(weights, values, W):
    dp = [0] * (W + 1)
    for w, v in zip(weights, values):
        for cap in range(W, w - 1, -1):  # backwards!
            dp[cap] = max(dp[cap], dp[cap - w] + v)
    return dp[W]
''') + tmpl("Template E — LCS (2D)", '''
def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]
''') + tmpl("Template F — LIS O(n log n)", '''
import bisect

def length_of_lis(nums):
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)
'''),
    """<ul><li><strong>Grid DP:</strong> unique paths, min path sum.</li>
    <li><strong>String DP:</strong> edit distance, palindrome partitioning.</li>
    <li><strong>State machine DP:</strong> buy/sell stock with cooldown.</li></ul>""",
    ["Wrong loop direction in 0/1 knapsack (must go backwards).", "Off-by-one in indices.", "Not initializing base cases.", "Using O(n²) LIS when O(n log n) needed."],
    "Dynamic Programming tag — largest category of hard mediums.",
    prob("198. House Robber", "Medium", "Max sum non-adjacent.", "Take/skip recurrence.", "Template B.") +
    prob("322. Coin Change", "Medium", "Min coins for amount.", "Unbounded knapsack style.", "Template C.") +
    prob("1143. Longest Common Subsequence", "Medium", "LCS length.", "2D match/mismatch.", "Template E.") +
    prob("300. Longest Increasing Subsequence", "Medium", "LIS length.", "Patience sorting / bisect.", "Template F.")
))

# ========== 16. BIT MANIPULATION ==========
SECTIONS.append(section(
    "bit-manipulation", 16, "Bit Manipulation (Basics)",
    ["Single number / find unique when others appear twice", "Count set bits / power of two", "XOR properties — a^a=0, a^0=a", "Bitmask DP for small n subsets", "Get/set/clear/toggle bit at position i"],
    """<p><strong>Core ops:</strong> AND (&), OR (|), XOR (^), NOT (~), shift (&lt;&lt;, &gt;&gt;).</p>
    <p><strong>Tricks:</strong></p>
    <ul>
    <li><code>x & (x-1)</code> clears lowest set bit</li>
    <li><code>x & -x</code> isolates lowest set bit</li>
    <li>Power of 2: <code>x > 0 and (x & (x-1)) == 0</code></li>
    </ul>""",
    """<p>XOR cancels pairs in O(n) time O(1) space vs hash map O(n) space. Bit tricks replace loops for bit-level operations.</p>""",
    """<p><strong>Bit ops:</strong> O(1) per operation.</p>
    <p><strong>Count bits 1..n:</strong> O(n log n) or DP O(n).</p>""",
    tmpl("Template A — Single number (XOR all)", '''
def single_number(nums):
    ans = 0
    for x in nums:
        ans ^= x
    return ans
''') + tmpl("Template B — Count set bits", '''
def hamming_weight(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count
''') + tmpl("Template C — Power of two", '''
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0
''') + tmpl("Template D — Subsets via bitmask", '''
def subsets_bitmask(nums):
    n = len(nums)
    res = []
    for mask in range(1 << n):
        res.append([nums[i] for i in range(n) if mask & (1 << i)])
    return res
''') + tmpl("Template E — DP count bits", '''
def count_bits(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp
'''),
    """<ul><li><strong>Single number II:</strong> count bits mod 3.</li>
    <li><strong>Divide two integers:</strong> bit shift subtraction.</li></ul>""",
    ["Python infinite bits for negative numbers — use <code>n & 0xFFFFFFFF</code> if needed.", "Confusing signed vs unsigned shift."],
    "Bit manipulation tag — clever math problems.",
    prob("136. Single Number", "Easy", "Every element twice except one.", "XOR all elements.", "Template A.") +
    prob("191. Number of 1 Bits", "Easy", "Count set bits.", "Brian Kernighan's algorithm.", "Template B.") +
    prob("338. Counting Bits", "Easy", "Count bits for 0..n.", "dp[i] = dp[i>>1] + i&1.", "Template E.") +
    prob("78. Subsets", "Medium", "All subsets (bitmask alternative to backtracking).", "Iterate mask 0 to 2^n-1.", "Template D.")
))

# ========== 17. FAST & SLOW POINTERS ==========
SECTIONS.append(section(
    "fast-slow", 17, "Fast & Slow Pointers (Linked List)",
    ["Linked list cycle detection", "Find middle of linked list", "Find cycle start (Floyd's algorithm)", "Palindrome linked list", "Reorder list / intersection"],
    """<p><strong>Floyd's cycle detection:</strong> Slow moves 1 step, fast moves 2. If cycle exists, they meet. If fast reaches null, no cycle.</p>
    <p><strong>Find middle:</strong> When fast at end, slow at middle.</p>
    <p><strong>Cycle start:</strong> After meeting, reset one pointer to head, move both 1 step — meet at cycle entrance.</p>""",
    """<p>O(n) time, O(1) space vs hash set O(n) space for cycle detection. Two pointers on linked list avoid index access which is O(n) per node.</p>""",
    """<p><strong>All variants:</strong> O(n) time, O(1) extra space.</p>""",
    tmpl("Template A — Has cycle", '''
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
''') + tmpl("Template B — Find cycle start", '''
def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            break
    else:
        return None
    slow = head
    while slow is not fast:
        slow = slow.next
        fast = fast.next
    return slow
''') + tmpl("Template C — Middle node", '''
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow
''') + tmpl("Template D — Palindrome linked list", '''
def is_palindrome_list(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    prev = None
    while slow:
        nxt = slow.next
        slow.next = prev
        prev = slow
        slow = nxt
    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left = left.next
        right = right.next
    return True
'''),
    """<ul><li><strong>Reorder list:</strong> find mid, reverse second half, merge.</li>
    <li><strong>Intersection:</strong> align lengths then walk together.</li></ul>""",
    ["Not checking fast.next before fast.next.next.", "Losing head when reversing.", "Even vs odd length middle definition."],
    "Linked list tag — almost always fast/slow or reverse.",
    prob("141. Linked List Cycle", "Easy", "Detect cycle.", "Floyd's algorithm.", "Template A.") +
    prob("142. Linked List Cycle II", "Medium", "Return cycle start node.", "Phase 2 reset to head.", "Template B.") +
    prob("876. Middle of the Linked List", "Easy", "Return middle node.", "Fast reaches end.", "Template C.") +
    prob("234. Palindrome Linked List", "Easy", "Is list palindrome?", "Find mid, reverse half, compare.", "Template D.")
))

# ========== 18. TREES & BST ==========
SECTIONS.append(section(
    "trees-bst", 18, "Tree Traversals + BST Properties",
    ["Binary tree recursion — return value from subtrees", "BST property: left < root < right (inorder sorted)", "LCA in BST vs binary tree", "Validate BST with min/max bounds", "Serialize/deserialize tree structure"],
    """<p><strong>Traversals:</strong></p>
    <ul>
    <li><strong>Inorder (LNR):</strong> BST → sorted order</li>
    <li><strong>Preorder (NLR):</strong> copy/serialize</li>
    <li><strong>Postorder (LRN):</strong> delete/bottom-up compute</li>
    <li><strong>Level order:</strong> BFS with queue</li>
    </ul>
    <p><strong>BST search:</strong> O(h) compare and go left/right. Balanced h=log n, skewed h=n.</p>""",
    """<p>Tree recursion exploits problem decomposition — answer at node combines subtree answers. BST ordering enables O(h) search vs O(n) scan.</p>""",
    """<p><strong>Traversal:</strong> O(n) time, O(h) stack space.</p>
    <p><strong>BST ops:</strong> O(h) average.</p>""",
    tmpl("Template A — Inorder iterative", '''
def inorder(root):
    stack, res = [], []
    cur = root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        res.append(cur.val)
        cur = cur.right
    return res
''') + tmpl("Template B — Validate BST", '''
def is_valid_bst(root):
    def dfs(node, lo, hi):
        if not node:
            return True
        if not (lo < node.val < hi):
            return False
        return dfs(node.left, lo, node.val) and dfs(node.right, node.val, hi)
    return dfs(root, float('-inf'), float('inf'))
''') + tmpl("Template C — LCA in BST", '''
def lca_bst(root, p, q):
    while root:
        if p.val < root.val and q.val < root.val:
            root = root.left
        elif p.val > root.val and q.val > root.val:
            root = root.right
        else:
            return root
''') + tmpl("Template D — LCA binary tree", '''
def lca_tree(root, p, q):
    if not root or root in (p, q):
        return root
    left = lca_tree(root.left, p, q)
    right = lca_tree(root.right, p, q)
    if left and right:
        return root
    return left or right
''') + tmpl("Template E — Kth smallest in BST", '''
def kth_smallest(root, k):
    stack = []
    cur = root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.left
        cur = stack.pop()
        k -= 1
        if k == 0:
            return cur.val
        cur = cur.right
'''),
    """<ul><li><strong>Max depth/diameter:</strong> postorder return heights.</li>
    <li><strong>Construct from preorder+inorder:</strong> split by root index.</li></ul>""",
    ["Validate BST: must use bounds not just immediate children.", "Integer overflow on bounds — use None or object bounds.", "Confusing LCA BST vs general tree."],
    "Tree, BST tags — very common in FAANG interviews.",
    prob("98. Validate Binary Search Tree", "Medium", "Check valid BST.", "Pass min/max bounds.", "Template B.") +
    prob("230. Kth Smallest Element in a BST", "Medium", "Kth inorder element.", "Iterative inorder.", "Template E.") +
    prob("235. Lowest Common Ancestor of a BST", "Medium", "LCA using BST property.", "Walk from root.", "Template C.") +
    prob("236. Lowest Common Ancestor of a Binary Tree", "Medium", "LCA general tree.", "Postorder bubble up.", "Template D.")
))

# ========== 19. DIJKSTRA ==========
SECTIONS.append(section(
    "dijkstra", 19, "Graph Shortest Path (Dijkstra)",
    ["Weighted graph — shortest path from source", "Non-negative edge weights", "Grid with cost per cell", "Min effort / min time with varying costs", "NOT for negative edges — use Bellman-Ford"],
    """<p><strong>Dijkstra:</strong> Greedy BFS with min-heap on distance. When you pop node u with smallest dist, that dist is final (non-negative weights).</p>
    <p><strong>Relaxation:</strong> if dist[u] + w(u,v) &lt; dist[v], update dist[v] and push to heap.</p>
    <p><strong>Grid variant:</strong> Each cell is node; 4 or 8 neighbors with edge weights.</p>""",
    """<p>BFS works for unit weights. Dijkstra generalizes to weighted graphs. Floyd-Warshall O(V³) is overkill for single-source. Bellman-Ford for negative edges only.</p>""",
    """<p><strong>With binary heap:</strong> O((V + E) log V).</p>
    <p><strong>Grid R×C:</strong> O(RC log(RC)).</p>""",
    tmpl("Template A — Dijkstra adjacency list", '''
import heapq

def dijkstra(n, graph, src):
    dist = [float('inf')] * n
    dist[src] = 0
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist
''') + tmpl("Template B — Grid min effort", '''
import heapq

def min_effort(heights):
    R, C = len(heights), len(heights[0])
    dist = [[float('inf')] * C for _ in range(R)]
    dist[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        effort, r, c = heapq.heappop(heap)
        if r == R-1 and c == C-1:
            return effort
        if effort > dist[r][c]:
            continue
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < R and 0 <= nc < C:
                ne = max(effort, abs(heights[r][c] - heights[nr][nc]))
                if ne < dist[nr][nc]:
                    dist[nr][nc] = ne
                    heapq.heappush(heap, (ne, nr, nc))
    return -1
''') + tmpl("Template C — Network delay (classic)", '''
import heapq
from collections import defaultdict

def network_delay(times, n, k):
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if u in dist:
            continue
        dist[u] = d
        for v, w in graph[u]:
            heapq.heappush(heap, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1
'''),
    """<ul><li><strong>0-1 BFS:</strong> deque when weights only 0 or 1.</li>
    <li><strong>K stops:</strong> Bellman-Ford or modified Dijkstra with (node, stops) state.</li></ul>""",
    ["Using Dijkstra with negative edges.", "Not skipping stale heap entries.", "Forgetting disconnected nodes."],
    "Shortest path, heap + graph combo problems.",
    prob("743. Network Delay Time", "Medium", "Time for all nodes to receive signal.", "Dijkstra from source k.", "Template C.") +
    prob("1631. Path With Minimum Effort", "Medium", "Min max-height-diff on path.", "Dijkstra on grid with effort metric.", "Template B.") +
    prob("787. Cheapest Flights Within K Stops", "Medium", "Cheapest path with ≤ k edges.", "Bellman-Ford k rounds or BFS on (node, stops).", "Modified shortest path — not pure Dijkstra.") +
    prob("778. Swim in Rising Water", "Hard", "Min time to reach bottom-right.", "Dijkstra / BS on answer on grid.", "Template B variant or BS on time.")
))

# ========== 20. DESIGN / SIMULATION ==========
SECTIONS.append(section(
    "design", 20, "Design / Simulation",
    ["Implement data structure with specific operation constraints", "LRU/LFU cache with O(1) ops", "Design Twitter / hit counter / logger", "Parse and simulate step-by-step rules", "Combine multiple known structures (hash + DLL, heap + map)"],
    """<p>Design problems test whether you can <strong>compose</strong> primitives into required API. Common building blocks:</p>
    <ul>
    <li><strong>Hash map</strong> for O(1) lookup</li>
    <li><strong>Doubly linked list</strong> for O(1) removal/insertion order (LRU)</li>
    <li><strong>Heap</strong> for top-K / scheduling</li>
    <li><strong>Tree/Trie</strong> for ordered or prefix data</li>
    </ul>
    <p><strong>Simulation:</strong> Follow problem rules literally in loops; use deque for queues.</p>""",
    """<p>No single trick — success comes from knowing which DS gives which operation in O(1) or O(log n). LRU = hash + doubly linked list is the classic interview composition.</p>""",
    """<p>Per operation target: O(1) or O(log n). Space usually O(capacity).</p>""",
    tmpl("Template A — LRU Cache", '''
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()
    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]
    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)
''') + tmpl("Template B — Min stack", '''
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []
    def push(self, val):
        self.stack.append(val)
        m = min(val, self.min_stack[-1] if self.min_stack else val)
        self.min_stack.append(m)
    def pop(self):
        self.stack.pop()
        self.min_stack.pop()
    def getMin(self):
        return self.min_stack[-1]
''') + tmpl("Template C — Time-based key-value store", '''
import bisect

class TimeMap:
    def __init__(self):
        self.store = {}  # key -> list of (timestamp, value)
    def set(self, key, value, timestamp):
        self.store.setdefault(key, []).append((timestamp, value))
    def get(self, key, timestamp):
        arr = self.store.get(key, [])
        i = bisect.bisect_right(arr, (timestamp, chr(127))) - 1
        return arr[i][1] if i >= 0 else ""
''') + tmpl("Template D — Moving average from data stream", '''
from collections import deque

class MovingAverage:
    def __init__(self, size):
        self.size = size
        self.q = deque()
        self.total = 0
    def next(self, val):
        self.q.append(val)
        self.total += val
        if len(self.q) > self.size:
            self.total -= self.q.popleft()
        return self.total / len(self.q)
'''),
    """<ul><li><strong>LRU manual:</strong> dict + doubly linked list nodes.</li>
    <li><strong>Hit counter:</strong> queue of timestamps.</li>
    <li><strong>File system:</strong> trie or nested dict.</li></ul>""",
    ["Race conditions not relevant on LeetCode but think thread-safety in real life.", "OrderedDict move_to_end trick.", "Off-by-one on capacity."],
    "Design tag — common in onsite rounds.",
    prob("146. LRU Cache", "Medium", "O(1) get/put with eviction.", "OrderedDict or hash+DLL.", "Template A.") +
    prob("155. Min Stack", "Medium", "Stack with O(1) getMin.", "Auxiliary min stack.", "Template B.") +
    prob("981. Time Based Key-Value Store", "Medium", "Get value at timestamp.", "Hash + binary search on timestamps.", "Template C.") +
    prob("346. Moving Average from Data Stream", "Easy", "Rolling average.", "Queue + running sum.", "Template D.")
))

# ========== INJECT INTO HTML ==========

APPENDIX = '''
  <section class="pattern" id="appendix">
    <h2>Appendix A — Pattern Decision Tree</h2>
    <div class="walkthrough">
      <p>When you read a problem, ask these questions <strong>in order</strong>:</p>
      <ol>
        <li><strong>Is it a design problem?</strong> (implement class/API) → Pattern 20</li>
        <li><strong>Is it a linked list?</strong> → Pattern 17 (fast/slow) or reverse list</li>
        <li><strong>Is it a tree/BST?</strong> → Pattern 18 (recursion/inorder)</li>
        <li><strong>Is it a graph or grid connectivity?</strong> → Pattern 8 (BFS/DFS)</li>
        <li><strong>Weighted shortest path?</strong> → Pattern 19 (Dijkstra)</li>
        <li><strong>Prerequisites / ordering?</strong> → Pattern 11 (Topo sort)</li>
        <li><strong>Dynamic connectivity?</strong> → Pattern 10 (Union-Find)</li>
        <li><strong>Generate all solutions?</strong> → Pattern 9 (Backtracking)</li>
        <li><strong>Prefix / dictionary of words?</strong> → Pattern 12 (Trie)</li>
        <li><strong>Intervals / meetings?</strong> → Pattern 13</li>
        <li><strong>Contiguous subarray/substring?</strong> → Pattern 3 (Sliding window) or 4 (Prefix sum)</li>
        <li><strong>Sorted array pair/triplet?</strong> → Pattern 2 (Two pointers)</li>
        <li><strong>Need O(1) lookup / frequency?</strong> → Pattern 1 (Hash map)</li>
        <li><strong>Next greater/smaller / brackets?</strong> → Pattern 6 (Stack)</li>
        <li><strong>Top K / merge streams?</strong> → Pattern 7 (Heap)</li>
        <li><strong>Minimize maximum / maximize minimum?</strong> → Pattern 5 (BS on answer)</li>
        <li><strong>Optimize with overlapping subproblems?</strong> → Pattern 15 (DP)</li>
        <li><strong>Local choice seems obviously safe?</strong> → Pattern 14 (Greedy) — but prove it</li>
        <li><strong>Bits / XOR / power of 2?</strong> → Pattern 16</li>
      </ol>
    </div>

    <h2>Appendix B — One-Line Pattern Summaries (Flash Cards)</h2>
    <table>
      <tr><th>#</th><th>Pattern</th><th>One-Line Memory Hook</th><th>Complexity</th></tr>
      <tr><td>1</td><td>Hash Map</td><td>"Have I seen complement?" → O(n) single pass</td><td>O(n)</td></tr>
      <tr><td>2</td><td>Two Pointers</td><td>Sorted? Converge left/right or slow/fast writer</td><td>O(n)</td></tr>
      <tr><td>3</td><td>Sliding Window</td><td>Contiguous + expand right, shrink left when bad</td><td>O(n)</td></tr>
      <tr><td>4</td><td>Prefix Sum</td><td>P[r]-P[l] in O(1); subarray sum K → map</td><td>O(n) build</td></tr>
      <tr><td>5</td><td>Binary Search</td><td>Monotonic? BS the answer with check(x)</td><td>O(log R)</td></tr>
      <tr><td>6</td><td>Stack</td><td>Recent unmatched; mono stack for next greater</td><td>O(n)</td></tr>
      <tr><td>7</td><td>Heap</td><td>Min-heap size K for top K largest</td><td>O(n log k)</td></tr>
      <tr><td>8</td><td>BFS/DFS</td><td>Unweighted shortest=BFS; explore all=DFS</td><td>O(V+E)</td></tr>
      <tr><td>9</td><td>Backtracking</td><td>Choose → recurse → undo</td><td>O(2^n)/O(n!)</td></tr>
      <tr><td>10</td><td>Union-Find</td><td>find+union with path compression</td><td>O(α(n))</td></tr>
      <tr><td>11</td><td>Topo Sort</td><td>Kahn: indegree 0 queue</td><td>O(V+E)</td></tr>
      <tr><td>12</td><td>Trie</td><td>Char-by-char tree; prefix search</td><td>O(L)</td></tr>
      <tr><td>13</td><td>Intervals</td><td>Sort by start merge; sort by end greedy</td><td>O(n log n)</td></tr>
      <tr><td>14</td><td>Greedy</td><td>Prove local optimal; often sort first</td><td>O(n log n)</td></tr>
      <tr><td>15</td><td>DP</td><td>State + recurrence + base; knapsack backwards</td><td>O(states)</td></tr>
      <tr><td>16</td><td>Bits</td><td>XOR pairs; x & (x-1) clears lowest bit</td><td>O(1)/op</td></tr>
      <tr><td>17</td><td>Fast/Slow</td><td>slow×1 fast×2 on linked list</td><td>O(n)</td></tr>
      <tr><td>18</td><td>Tree/BST</td><td>Recurse; BST inorder=sorted</td><td>O(n)</td></tr>
      <tr><td>19</td><td>Dijkstra</td><td>Min-heap on distance; non-negative weights</td><td>O(E log V)</td></tr>
      <tr><td>20</td><td>Design</td><td>Compose hash+DLL, heap+map, etc.</td><td>O(1) ops</td></tr>
    </table>

    <h2>Appendix C — 50-Day Study Schedule (Maps to This Guide)</h2>
    <table>
      <tr><th>Days</th><th>Patterns</th><th>Action</th></tr>
      <tr><td>1–3</td><td>1, 2, 3</td><td>Read + memorize templates A–C each. Do 4 practice problems/pattern.</td></tr>
      <tr><td>4–5</td><td>4, 5</td><td>Prefix sum + binary search. Redo day 1–3 problems from memory.</td></tr>
      <tr><td>6–8</td><td>6, 7</td><td>Stack + heap. Write all templates closed-book.</td></tr>
      <tr><td>9–12</td><td>8, 9</td><td>BFS/DFS + backtracking — hardest to speed up; draw recursion trees.</td></tr>
      <tr><td>13–15</td><td>10, 11, 12</td><td>Union-Find, topo, trie.</td></tr>
      <tr><td>16–18</td><td>13, 14</td><td>Intervals + greedy.</td></tr>
      <tr><td>19–25</td><td>15</td><td>Full DP week — 1D, 2D, knapsack. Do NOT rush.</td></tr>
      <tr><td>26–28</td><td>16, 17, 18</td><td>Bits, linked list, trees.</td></tr>
      <tr><td>29–31</td><td>19, 20</td><td>Dijkstra + design.</td></tr>
      <tr><td>32–40</td><td>All</td><td>Random medium — identify pattern in 3 min before coding.</td></tr>
      <tr><td>41–47</td><td>Weak spots</td><td>Re-do missed practice problems spaced repetition.</td></tr>
      <tr><td>48–50</td><td>Mock</td><td>2 timed mediums per session; verbalize pattern choice.</td></tr>
    </table>

    <h2>Appendix D — Master Template Recall Checklist</h2>
    <p>Every night, write these skeletons from memory on paper (15 min):</p>
    <div class="memory-box">
1. two_sum: seen={}; need=target-x; if need in seen<br>
2. sliding window: expand right; while invalid: shrink left; update best<br>
3. prefix+map: prefix+=x; count+=freq[prefix-k]; freq[prefix]++  (init {0:1})<br>
4. BS on answer: while lo&lt;hi: mid; if feasible(mid): hi=mid else lo=mid+1<br>
5. mono stack: while stack and nums[stack[-1]]&lt;x: pop; res[pop]=x; push i<br>
6. top K heap: push; if len&gt;k: pop<br>
7. grid DFS: if invalid: return; mark; recurse 4 dirs<br>
8. backtrack: if done: save; for choice: add; dfs; remove<br>
9. union-find: find with compression; union by rank<br>
10. Kahn: indeg; queue 0-indeg; pop; reduce neighbor indeg<br>
11. merge intervals: sort; if overlap extend else append<br>
12. knapsack 0/1: for w,v: for cap in range(W,w-1,-1): dp[cap]=max(...)<br>
13. Floyd cycle: slow=fast=head; while fast: slow=slow.next; fast=fast.next.next<br>
14. validate BST: dfs(node, lo, hi): lo &lt; val &lt; hi<br>
15. Dijkstra: heap (0,src); pop; if stale continue; relax neighbors
    </div>

    <h2>Appendix E — All 80 Practice Problems Index</h2>
    <p>Complete these in order per pattern section. ✓ when solved without template peek.</p>
    <table>
      <tr><th>Pattern</th><th>Problems (LeetCode #)</th></tr>
      <tr><td>1 Hash Map</td><td>1, 49, 128, 560</td></tr>
      <tr><td>2 Two Pointers</td><td>125, 15, 11, 42</td></tr>
      <tr><td>3 Sliding Window</td><td>3, 76, 567, 904</td></tr>
      <tr><td>4 Prefix Sum</td><td>303, 560, 238, 304</td></tr>
      <tr><td>5 Binary Search</td><td>704, 875, 1011, 33</td></tr>
      <tr><td>6 Stack</td><td>20, 739, 84, 150</td></tr>
      <tr><td>7 Heap</td><td>215, 347, 23, 295</td></tr>
      <tr><td>8 BFS/DFS</td><td>200, 695, 133, 127</td></tr>
      <tr><td>9 Backtracking</td><td>78, 46, 39, 51</td></tr>
      <tr><td>10 Union-Find</td><td>323, 261, 684, 721</td></tr>
      <tr><td>11 Topo Sort</td><td>207, 210, 269, 802</td></tr>
      <tr><td>12 Trie</td><td>208, 212, 648, 211</td></tr>
      <tr><td>13 Intervals</td><td>56, 57, 435, 253</td></tr>
      <tr><td>14 Greedy</td><td>55, 45, 134, 763</td></tr>
      <tr><td>15 DP</td><td>198, 322, 1143, 300</td></tr>
      <tr><td>16 Bit Manipulation</td><td>136, 191, 338, 78</td></tr>
      <tr><td>17 Fast/Slow</td><td>141, 142, 876, 234</td></tr>
      <tr><td>18 Trees/BST</td><td>98, 230, 235, 236</td></tr>
      <tr><td>19 Dijkstra</td><td>743, 1631, 787, 778</td></tr>
      <tr><td>20 Design</td><td>146, 155, 981, 346</td></tr>
    </table>
  </section>
'''

def main():
    base = Path(__file__).parent / "leetcode-patterns-mastery.html"
    html = base.read_text()
    content = "\n".join(SECTIONS) + "\n" + APPENDIX
    marker = "<!-- PATTERN SECTIONS INSERTED BELOW -->"
    if marker not in html:
        raise SystemExit("Marker not found in HTML")
    html = html.replace(marker, content)
    base.write_text(html)
    lines = html.count("\n") + 1
    print(f"Wrote {len(SECTIONS)} patterns + appendix, {lines} lines to {base}")

if __name__ == "__main__":
    main()
