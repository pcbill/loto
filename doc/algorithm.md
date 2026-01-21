shuffle 的演算法說明
這個 `shuffle` 演算法是**正確且公平的**！

這是著名的 **Fisher-Yates (Knuth) Shuffle** 演算法：

```javascript
var j, x;
for (let i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));  // 0 到 i 之間的隨機數
    x = a[i];
    a[i] = a[j];
    a[j] = x;
}
return a;
```

## ✅ 為什麼它是公平的？

| 特性 | 說明 |
|------|------|
| **均勻分佈** | 每個元素出現在任何位置的機率都是 $\frac{1}{n}$ |
| **時間複雜度** | $O(n)$ - 只遍歷一次 |
| **空間複雜度** | $O(1)$ - 原地交換 |
| **總排列數** | 恰好產生 $n!$ 種可能的排列 |

## 🔬 數學證明

對於 n 個元素，演算法產生的排列數量：
$$n \times (n-1) \times (n-2) \times ... \times 1 = n!$$

這正好等於所有可能排列的數量，且每種排列的機率相等。

## ⚠️ 常見的錯誤實作（不公平）

```javascript
// ❌ 錯誤：這個不公平！
for (let i = 0; i < a.length; i++) {
    j = Math.floor(Math.random() * a.length);  // 每次都從全範圍選
    [a[i], a[j]] = [a[j], a[i]];
}
```

這種方式會產生 $n^n$ 種結果，無法均勻映射到 $n!$ 種排列。

---

**結論：你的程式碼使用的是標準正確的 Fisher-Yates 演算法，抽獎結果是公平的！** 🎰