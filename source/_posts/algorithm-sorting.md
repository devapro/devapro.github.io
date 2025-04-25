---
title: Алгоритмы сортировки
date: 2020-03-01 02:02:32
categories:
- Algorithm
tags:
- algorithm
excerpt:
- Основные алгоритмы сортировки с кратким описанием
---

## Сортировка пузырьком
Алгоритм просматривает массив и сравнивает каждую пару соседних элементов. Когда он встречает пару элементов, расположенных не по порядку, происходит замена двух элементов местами.


**Шаги для сортировки массива чисел от наименьшего к большему:**

> 4 2 1 5 3: два первых элемента расположены в массиве в неверном порядке. Меняем их.
> 2 4 1 5 3: вторая пара элементов тоже «не в порядке». Меняем и их.
> 2 1 4 5 3: а эти два элемента в верном порядке (4 < 5), поэтому оставляем как есть.
> 2 1 4 5 3: очередная замена.
> 2 1 4 3 5: результат после одной итерации.

``` java
public static void bubbleSort(int[] array) {  
    boolean sorted = false;
    int temp;
    while(!sorted) {
        sorted = true;
        for (int i = 0; i < array.length - 1; i++) {
            if (array[i] > array[i+1]) {
                temp = array[i];
                array[i] = array[i+1];
                array[i+1] = temp;
                sorted = false;
            }
        }
    }
}
```

### Временная сложность O(n ^ 2).

## Быстрая сортировка
Выбирает один элемент массива в качестве стержня и сортирует остальные элементы вокруг (меньшие элементы налево, большие направо).

``` java
static int partition(int[] array, int begin, int end) {  
    int pivot = end;

    int counter = begin;
    for (int i = begin; i < end; i++) {
        if (array[i] < array[pivot]) {
            int temp = array[counter];
            array[counter] = array[i];
            array[i] = temp;
            counter++;
        }
    }
    int temp = array[pivot];
    array[pivot] = array[counter];
    array[counter] = temp;

    return counter;
}

public static void quickSort(int[] array, int begin, int end) {  
    if (end <= begin) return;
    int pivot = partition(array, begin, end);
    quickSort(array, begin, pivot-1);
    quickSort(array, pivot+1, end);
}
```

### Временная сложность O(n^2).
**Преимущества** - у алгоритма очень хорошее среднее время запуска, также равное O(nlog n), он эффективен для больших потоков ввода. Алгоритм не занимает дополнительного пространства, вся сортировка происходит «на месте», отсутствуют затратные вызовы распределения, из-за чего его часто предпочитают сортировке слиянием.

## Сортировка вставками

* Этот алгоритм разделяет оригинальный массив на сортированный и несортированный подмассивы.

* Длина сортированной части равна 1 в начале и соответствует первому (левому) элементу в массиве. После этого остается итерировать массив и расширять отсортированную часть массива одним элементом с каждой новой итерацией.

* После расширения новый элемент помещается на свое место в отсортированном подмассиве. Это происходит путём сдвига всех элементов вправо, пока не встретится элемент, который не нужно двигать.



> 3 5 7 8 4 2 1 9 6: выбираем 4 и помним, что это элемент, который нужно вставить. 8 > 4, поэтому сдвигаем.
> 3 5 7 x 8 2 1 9 6: здесь x – нерешающее значение, так как элемент будет перезаписан (на 4, если это подходящее место, или на 7, если смещение). 7 > 4, поэтому сдвигаемся.
> 3 5 x 7 8 2 1 9 6
> 3 x 5 7 8 2 1 9 6
> 3 4 5 7 8 2 1 9 6

``` java
public static void insertionSort(int[] array) {  
    for (int i = 1; i < array.length; i++) {
        int current = array[i];
        int j = i - 1;
        while(j >= 0 && current < array[j]) {
            array[j+1] = array[j];
            j--;
        }
         // в этой точке мы вышли, так что j так же -1 
         // или в первом элементе, где текущий >= a[j]
        array[j+1] = current;
    }
}
```
### Временная сложность O(n ^ 2).

## Сортировка выбором
Сортировка выбором тоже разделяет массив на сортированный и несортированный подмассивы. Но на этот раз сортированный подмассив формируется вставкой минимального элемента не отсортированного подмассива в конец сортированного, заменой.


> 3 5 1 2 4
> 1 5 3 2 4
> 1 2 3 5 4
> 1 2 3 5 4
> 1 2 3 4 5
> 1 2 3 4 5

``` java
public static void selectionSort(int[] array) {  
    for (int i = 0; i < array.length; i++) {
        int min = array[i];
        int minId = i;
        for (int j = i+1; j < array.length; j++) {
            if (array[j] < min) {
                min = array[j];
                minId = j;
            }
        }
        // замена
        int temp = array[i];
        array[i] = min;
        array[minId] = temp;
    }
}
```

### Временная сложность O(n^2).

## Сортировка слиянием
Массив делится на два подмассива, а затем происходит:

* Сортировка левой половины массива (рекурсивно)
* Сортировка правой половины массива (рекурсивно)
* Слияние

``` java
public static void mergeSort(int[] array, int left, int right) {  
    if (right <= left) return;
    int mid = (left+right)/2;
    mergeSort(array, left, mid);
    mergeSort(array, mid+1, right);
    merge(array, left, mid, right);
}

void merge(int[] array, int left, int mid, int right) {
    // вычисляем длину
    int lengthLeft = mid - left + 1;
    int lengthRight = right - mid;

    // создаем временные подмассивы
    int leftArray[] = new int [lengthLeft];
    int rightArray[] = new int [lengthRight];

    // копируем отсортированные массивы во временные
    for (int i = 0; i < lengthLeft; i++)
        leftArray[i] = array[left+i];
    for (int i = 0; i < lengthRight; i++)
        rightArray[i] = array[mid+i+1];

    // итераторы содержат текущий индекс временного подмассива
    int leftIndex = 0;
    int rightIndex = 0;

    // копируем из leftArray и rightArray обратно в массив  
    for (int i = left; i < right + 1; i++) {
        // если остаются нескопированные элементы в R и L, копируем минимальный
        if (leftIndex < lengthLeft && rightIndex < lengthRight) {
            if (leftArray[leftIndex] < rightArray[rightIndex]) {
                array[i] = leftArray[leftIndex];
                leftIndex++;
            }
            else {
                array[i] = rightArray[rightIndex];
                rightIndex++;
            }
        }
        // если все элементы были скопированы из rightArray, скопировать остальные из leftArray
        else if (leftIndex < lengthLeft) {
            array[i] = leftArray[leftIndex];
            leftIndex++;
        }
        // если все элементы были скопированы из leftArray, скопировать остальные из rightArray
        else if (rightIndex < lengthRight) {
            array[i] = rightArray[rightIndex];
            rightIndex++;
        }
    }
}
```

### Временная сложность O(nlog n)

## Пирамидальная сортировка
**Пирамида** или двоичная куча – это дерево, в котором каждый узел состоит в отношениях с дочерними узлами. Добавление нового узла начинается с левой позиции нижнего неполного уровня.

``` java
static void heapify(int[] array, int length, int i) {  
    int leftChild = 2*i+1;
    int rightChild = 2*i+2;
    int largest = i;

    // если левый дочерний больше родительского
    if (leftChild < length && array[leftChild] > array[largest]) {
        largest = leftChild;
    }

    // если правый дочерний больше родительского
    if (rightChild < length && array[rightChild] > array[largest]) {
        largest = rightChild;
    }

    // если должна произойти замена
    if (largest != i) {
        int temp = array[i];
        array[i] = array[largest];
        array[largest] = temp;
        heapify(array, length, largest);
    }
}

public static void heapSort(int[] array) {  
    if (array.length == 0) return;

    // Строим кучу
    int length = array.length;
    // проходим от первого без ответвлений к корню
    for (int i = length / 2-1; i >= 0; i--)
        heapify(array, length, i);

    for (int i = length-1; i >= 0; i--) {
        int temp = array[0];
        array[0] = array[i];
        array[i] = temp;

        heapify(array, i, 0);
    }
}
```

## Временная сложность O(nlog n).