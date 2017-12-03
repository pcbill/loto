var shuffle = (a) => {

    for ( i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

//// way 2
//    var currentIndex = array.length, temporaryValue, randomIndex;
//    
//      // While there remain elements to shuffle...
//      while (0 !== currentIndex) {
//    
//        // Pick a remaining element...
//        randomIndex = Math.floor(Math.random() * currentIndex);
//        currentIndex -= 1;
//    
//        // And swap it with the current element.
//        temporaryValue = array[currentIndex];
//        array[currentIndex] = array[randomIndex];
//        array[randomIndex] = temporaryValue;
//      }
//    
//      return array;

//// way 3
//    var j, x, i;
//    for (i = a.length - 1; i > 0; i--) {
//        j = Math.floor(Math.random() * (i + 1));
//        x = a[i];
//        a[i] = a[j];
//        a[j] = x;
//    }
  //  return a;


}
exports.shuffle = shuffle;