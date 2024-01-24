/**
 * @desc Get the right ACAT URL
 * @param interface IParams
 * @returns string
 */
import { IParams } from '../interfaces';

class Url{
  params: IParams ;

  constructor(params){
    this.params = params ;
  }

  getUrl(URL){
    if(this.params.type && this.params.mark && this.params.model && this.params.numbers) return encodeURI(
      `${URL}/${this.params.type}/${this.params.mark}/${this.params.model}/${this.params.numbers}`) ;

    if(this.params.type && this.params.mark && this.params.model) return encodeURI(
      `${URL}/${this.params.type}/${this.params.mark}/${this.params.model}`) ;

    if(this.params.type && this.params.mark) return encodeURI(
      `${URL}/${this.params.type}/${this.params.mark}`) ;

    return URL ;
  }
}

export default Url
