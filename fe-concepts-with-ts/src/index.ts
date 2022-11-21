type Listener<T> = (cars: T[]) => void;

enum CarStatus{
    ON_PRODUCTION = 'onproduction'
}


class Car {
    status: CarStatus;
    id: number;
    constructor(public brand: string,
        public model: string,
        public door: number,
        public lineId: string){
            this.status = CarStatus.ON_PRODUCTION
            this.id = Math.floor(Math.random() * 100)
        }
}


abstract class StateManager<T>{
    protected listeners: Listener<T>[]
    constructor() {
        this.listeners = [];
    }

    subscribe(listener: Listener<T>): void {
        this.listeners.push(listener)
    }
}

class CarState extends StateManager<Car>{
   private _cars: Car[];;
   private static instance: CarState;
   private constructor(){
        super();
        this._cars = [];
    }

    static getInstance(){
        if(!CarState.instance) {
            CarState.instance = new CarState();
        }
        return CarState.instance;
    }

    public get cars(): Car[]{
        return [...this._cars] 
    }

    addCar(brand: string, model: string, age: number, lineId: string) {
        const newCar = new Car(brand, model, age, lineId)
        this._cars.push(newCar)
        this.publish()
    }

    publish(){
        for(const listener of this.listeners){
            listener([...this._cars])
        }
    }

}

const carState = CarState.getInstance();

class Validateable {
    constructor(public value: string | number, public required: boolean, public min?: number, public max?: number, public minLength?: number, public maxLength?: number){}
    isValid() : boolean{
        let isValid: boolean = this.required ? Boolean(this.value) : true;
        if(typeof this.value === 'number') {
            if(this.max) {
                isValid = this.value <= this.max;
            }
            if(this.min) {
                isValid = this.value >= this.min;
            }    
        }
        if(typeof this.value === 'string') {
            if(this.maxLength) {
                isValid = this.value.length <= this.maxLength;
            }
            if(this.minLength) {
                isValid = this.value.length >= this.minLength;
            }
        }
    
        return isValid;
    }
}

type Position = 'afterbegin' | 'afterend' | 'beforebegin' | 'beforeend';

abstract class Component<T extends HTMLElement, U extends HTMLElement>{
    hostElement: T;
    element: U;
    templateElement: HTMLTemplateElement;
    constructor(public templateId: string, public hostElementId: string, public newElementId: string, public position: Position = 'beforeend' ) {
        this.hostElement = <T>document.getElementById(hostElementId);
        this.templateElement = <HTMLTemplateElement>document.getElementById(templateId) ;
        const node = document.importNode(this.templateElement.content, true)
        this.element = <U>node.firstElementChild
        this.element.id = newElementId;
        this.attach();
    }

    attach(){
        this.hostElement.insertAdjacentElement(this.position, this.element)
    }

    abstract render(): void;
    abstract setup(): void;
}

class FormComponent extends Component<HTMLDivElement, HTMLFormElement>{
    brandElement: HTMLInputElement;
    modelElement: HTMLInputElement;
    doorElement: HTMLInputElement;
    lineElement: HTMLInputElement;
    constructor(templateId: string, hostElementId: string, newElementId: string, position: Position = 'beforeend') {
        super(templateId, hostElementId, newElementId, position)
        this.brandElement = <HTMLInputElement>document.getElementById("brand");
        this.modelElement = <HTMLInputElement>document.getElementById("model");
        this.doorElement = <HTMLInputElement>document.getElementById("door");
        this.lineElement = <HTMLInputElement>document.getElementById("lineId");
        this.setup();
    }

    clearInputs() {
        this.brandElement.value = '';
        this.modelElement.value = '';
        this.doorElement.value = '';
    }

    getInputs(): [string, string, number, string] {
        const brand = this.brandElement.value;
        const model = this.modelElement.value;
        const door = this.doorElement.value;
        const lineId = this.lineElement.value;

        

        return [brand, model, +door, lineId]
    }

    setup() {
        this.element.addEventListener('submit', this.submitHandler)
    }

    @autobind
    submitHandler(event: Event) {
        event.preventDefault()
        const inputs = this.getInputs();
        if(Array.isArray(inputs)){
            const [brand, model, door, lineId] = inputs;
            const brandValidation = new Validateable(brand, true);
            const modelValidation = new Validateable(model, true);
            const doorValidation = new Validateable(door, true, 3, 5);

            if(brandValidation.isValid() && modelValidation.isValid() && doorValidation.isValid()){
                carState.addCar(brand, model, door, lineId)
                this.clearInputs();
            }else {
                console.log('Inputs are not valid!')
            }
            
        }
    }

    render(){}
}

class LineComponent extends Component<HTMLElement, HTMLTemplateElement>{
    lineContainer: HTMLElement;
    constructor(templateId: string,hostElementId: string, newElementId: string, position: Position = 'beforeend' ){
        super(templateId, hostElementId, newElementId, position );
        this.lineContainer = document.getElementById(this.newElementId)!;
        this.lineContainer.querySelector('h1')!.innerHTML = this.newElementId
        this.setup();
    }

    setup(): void {
        carState.subscribe((cars) => {
            this.render()
        })
    }

    render() {
        const carOnLine = carState.cars.reverse().find(car => car.lineId === this.newElementId && car.status === CarStatus.ON_PRODUCTION)!;
        if(carOnLine){
        new CarComponent(this.newElementId, `car-${carOnLine.id}`, {brand: carOnLine.brand, model: carOnLine.model, door: carOnLine.door}).render()
        }
        
    }
}

class CarComponent extends Component<HTMLElement, HTMLTemplateElement>{
    props: any;
    constructor(hostElementId: string, newElementId: string, props: unknown , position: Position = 'beforeend') {
        super('car', hostElementId, newElementId, position );
        this.props = props;
    }

    setup() {}

    render() {  
        const carContainer = this.hostElement.querySelector('#' + this.newElementId)!;
        carContainer.querySelector('.car-brand')!.innerHTML = this.props.brand;
        carContainer.querySelector('.car-model')!.innerHTML = this.props.model;
        carContainer.querySelector('.car-door')!.innerHTML = this.props.door;
    }
}


function autobind(_: any, _2: string , descriptor: PropertyDescriptor ) {
    const originalMethod = descriptor.value;
    const newDescriptor = {
        configurable: true,
        get() {
            const boundFn = originalMethod.bind(this)
            return boundFn
        }
    }

    return newDescriptor
}

new FormComponent('add-car', 'app','new-car', 'afterbegin')
new LineComponent('line', 'app', 'line1')
new LineComponent('line', 'app', 'line2')