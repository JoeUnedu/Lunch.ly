/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, nbrOfRes = 0 }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.fullName = this.createFullName();
    this.phone = phone;
    this.notes = notes;
    this.nbrOfRes = nbrOfRes;
  }


  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }


  /** find best 10 customers. */

  static async best10() {
    const results = await db.query(
      `SELECT cust.id
         , cust.first_name AS "firstName"
         , cust.last_name AS "lastName"
         , cust.phone
         , cust.notes
         , COUNT(res.id) AS "nbrOfRes"
       FROM customers AS cust
       JOIN reservations AS res ON cust.id = res.customer_id
       GROUP BY cust.id
       ORDER BY COUNT(res.id) DESC
       LIMIT 10`
    );
    return results.rows.map(c => new Customer(c));
  }


  /** search for customer(s) */

  static async search(searchFor) {

    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName" 
         , last_name AS "lastName"  
         , phone 
         , notes
       FROM customers
       WHERE first_name ILIKE $1 or last_name ILIKE $1 
       ORDER BY last_name, first_name`,
      [`%${searchFor.trim()}%`]
    );

    // build a message
    let msgNbrFound = "";
    if (results.rows.length > 1) {
      msgNbrFound = `${results.rows.length} customers were found with `;
    } else {
      if (results.rows.length === 1) {
        msgNbrFound = `${results.rows.length} customer was found with `;
      } else {
        // 0 found
        msgNbrFound = `No customers were found with `;
      }
    }
    msgNbrFound = `${msgNbrFound}'${searchFor.trim()}' in their name.`;

    return {
      customers: results.rows.map(c => new Customer(c)),
      message: msgNbrFound
    }
  }


  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }


  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }


  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }


  createFullName() {
    // creates a full name for this customer.
    return `${this.firstName.trim()}  ${this.lastName.trim()}`;
  }

}


module.exports = Customer;
