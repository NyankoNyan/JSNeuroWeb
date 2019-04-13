/*
План для нейросети.
Делаем простенькую многослойную с обратным распространением ошибки.
Уровни абстракции модели:
1) Уровень рабочих шагов. Можно назвать это уровнем обучения и работы нейросети.
2) Уровень слоёв нейросети. 
3) Уровень конкретизации слоёв. Будут входные связи, выходные связи, межслойные связи, связи функций активации. В зависимости от этого их надо будет специфически обрабатывать. Здесь же будет интерфейс для получения предыдущих состояний связи.
4) Уровень хранения данных. Здесь мы будем хранить всё наше дерьмо.
Цель. Научиться реализовывать простые нейросети и обучать их; подготовить себе дальнейшую платформу на JS для решения практических задач. 
Задача. Сделать многослойную нейросеть с механизмом обратного распространения ошибки и испытать её.
Срок: неделя. К 6-у апреля у меня уже должна быть рабочая нейросеть.
*/

"use strict";

// Тестирование нейросети на примере XOR-функции
function TestXor(){
	
	var nw = new NeuralWorkflow();
	nw.init([
		{
			size:2
		},
		{
			size:2
		},
		{
			size:1
		}
	]);	
	
	randomXor = function(){		
		var first = (Math.random() < 0.5) ? 0 : 1;
		var second  = (Math.random() < 0.5) ? 0 : 1;
		var result = first != second;
		return [first, second, result];
	};
	
	const learnStepCount = 100;
	for(var it = 0; it < learnStepCount; it++){
		var someXor = randomXor();
		nw.learn([someXor[0],someXor[1]], someXor[2]); 
	}
	
	return [
		nw.ask([0, 0])[0],
		nw.ask([0, 1])[0],
		nw.ask([1, 0])[0],
		nw.ask([1, 1])[0]
	];
}

// Это основной класс рабочего процесса. Отвечает за инициализацию нейросети и работу с ней извне. 
function NeuralWorkflow(){
	this.layers = [];
	this.inputLayer = null;
	this.outputLayer = null;
	this.linkStorage = null;	
}
NeuralWorkflow.prototype.init = function(layersSettings){
	
	this.linkStorage = new LinkStorage();
	
	var lastNodeLayer = null;
	for(var it = 0; it < layersSettings.length; it++){
		var layerSettings = layersSettings[layerIt];
		var newNodeLayer = null;
		if(it == 0){
			newNodeLayer = new InputLayer(this.linkStorage, layersSettings.size);
			this.inputLayer = newNodeLayer;
		}
		else{
			newNodeLayer = new FunctionLayer(this.linkStorage);
			this.layers.push(new ConnectionLayer(this.linkStorage, lastNodeLayer, newNodeLayer));
		}		
		this.layers.push(newNodeLayer);
		lastNodeLayer = newNodeLayer;
	}
	this.outputLayer = lastNodeLayer;
};
NeuralWorkflow.prototype.learn = function(inputValues, outputValues){
	this._computeAllLayers(inputValues);
	var computeValues = this.outputLayer.getOutputNodes();
	// Здесь должно быть сравнение outputValues и computeValues и расчет обратного распространения ошибки
};
NeuralWorkflow.prototype.ask = function(inputValues){
	this._computeAllLayers(inputValues);
	return this.outputLayer.getOutputNodes();
};
NeuralWorkflow.prototype._computeAllLayers = function(inputValues){
	this.firstLayer.setValues(inputValues);
	for(var layer of layers){
		layer.computeStep();
	}
};

// Слой нейросети (абстрактный)
function NeuralLayer(linkStorage){
	this.linkStorage = linkStorage;
}
NeuralLayer.prototype.computeStep = function(){};
NeuralLayer.prototype.getInputMeta = function(){
	return null;
};
NeuralLayer.prototype.getOutputMeta = function(){
	return null;
};

// Слой соединений. Позволяет просуммировать ноды одного слоя в соединённые ноды другого с учетом весов связей.
function ConnectionLayer(linkStorage, firstLayer, secondLayer){
	
	NeuralLayer.call(this, linkStorage);
	this.firstLayer = firstLayer;
	this.secondLayer = secondLayer;
	
	var inputMeta = this.getInputMeta();
	var outputMeta = this.getOutputMeta();
	
	var links = [];
	
	for(var inputIt = inputMeta.firstId; inputIt <= inputMeta.lastId; inputIt++){
		for(var outputIt = outputMeta.firstId; outputIt <= outputMeta.lastId; outputId++){
			links.push([inputIt, outputIt, 0]);
		}
	}
	
	this.linkLayerMeta = this.linkStorage.addLinks(links);
}
Object.setPrototypeOf(ConnectionLayer.prototype, NeuralLayer.prototype);
ConnectionLayer.prototype.computeStep = function(){
	for(var linkId = this.linkLayerMeta.firstId; linkId <= this.linkLayerMeta.lastId; linkId++){
		var link = this.linkStorage.links[linkId];
		this.linkStorage.nodes[link[1]] += this.linkStorage.nodes[link[0]] * link[2];
	}
};
ConnectionLayer.prototype.getInputMeta = function(){
	return this.firstLayer.getOutputMeta();
};
ConnectionLayer.prototype.getOutputMeta = function(){
	return this.secondLayer.getInputMeta();
};

// Слой функций. Позволяет применить функцию активации к значению во входной ноды и получить тем самым значение выходной.
function FunctionLayer(linkStorage, size){
	
	NeuralLayer.call(this, linkStorage);
	
	this.size = size;
	
	var nodes = [];
	for(var it = 0; it < size; it++){
		nodes[it] = 0;
	}
	
	this.sumLayerMeta = this.linkStorage.addNodes(nodes);
	this.productLayerMeta = this.linkStorage.addNodes(nodes);
	
	var links = [];
	for(var it = 0; it < size; it++){
		links[it] = [this.sumLayerMeta.firstId + it, this.productLayerMeta.firstId + it, 0];
	}
	this.linkLayerMeta = this.linkStorage.addLinks(links);
}
Object.setPrototypeOf(FunctionLayer.prototype, NeuralLayer.prototype);
FunctionLayer.prototype.computeStep = function(){
	for(var linkId = this.linkLayerMeta.firstId; linkId <= this.linkLayerMeta.lastId; linkId++){
		var link = this.linkStorage.links[linkId];
		this.linkStorage.nodes[link[1]] = this._activationFunc(this.linkStorage.nodes[link[0]]);
	}
};
FunctionLayer.prototype._activationFunc = function(sum){
	// Написать функцию активации
}
FunctionLayer.prototype.getInputMeta = function(){
	return this.sumLayerMeta;
};
FunctionLayer.prototype.getOutputMeta = function(){
	return this.productLayerMeta;
};

// Слой входных нод
function InputLayer(linkStorage, size){
	NeuralLayer.call(this, linkStorage);
	this.size = size;
	var nodes = [];
	for(var it = 0; it < size; it++){
		nodes[it] = 0;
	}
	this.layerMeta = this.linkStorage.addNodes(nodes);
}
Object.setPrototypeOf(InputLayer.prototype, NeuralLayer.prototype);
InputLayer.prototype.computeStep = function(){};
InputLayer.prototype.getOutputMeta = function(){
	return this.layerMeta;
};

// Слой хранения значений. Позволяет выполнять запросы к данным.
function LinkStorage(){
	this.stepStorage = [new TimeStepStorage()];	
}
LinkStorage.prototype.addLinks = function(links){
	return this._addDataArray(this.stepStorage[0].links, links);
}
LinkStorage.prototype.addNodes = function(nodes){
	return this._addDataArray(this.stepStorage[0].nodes, nodes);
}
LinkStorage.prototype._addDataArray = function(innerArray, addArray){
	if(!(addArray.length > 0)){
		return null;
	}		
	var layerMeta = {};
	layerMeta.firstId = innerArray.length;
	Array.prototype.push.apply(innerArray, addArray);
	layerMeta.lastId = innerArray.length - 1;
	layerMeta.size = addArray.size;
	return layerMeta;
}

// Хранит данные одного шага по времени
function TimeStepStorage(){
	this.nodes = [];
	this.links = [];
}

// function StaticNeural(){
	// this.layers = [];
	// this.jointCount = 0;
	// this.states = [];
// }

// StaticNeuroWeb.prototype.addLayer = function(size){
	// var firstId = this.jointCount;
	// var lastId = firstId + size;
	// this.jointCount = lastId + 1;
	// this.layers.push({
		// first:firstId,
		// last:lastId
	// });
// }

// StaticNeuroWeb.prototype.createLinks = function(){
	// for(var layerId = 0; layerId < this.layers.length - 1; layerId++){
		// var layer = this.layers[layerId];
		// var nextLayer = this.layers[layerId + 1];
		// for(var jointId = layer.first; jointId <= layer.last; jointId++){
			// for(var nextJointId = nextLayer.first; nextJointId <= nextLayer.last; nextJointId++){
				// this.states.push 
			// }
		// }
	// }
// }

