import { sayHello } from '../hello';

describe('sayHello', () => {
    it('should return default greeting when no name is provided', () => {
        expect(sayHello()).toBe('Hello, World!');
    });

    it('should return personalized greeting when name is provided', () => {
        expect(sayHello('Alice')).toBe('Hello, Alice!');
    });
}); 