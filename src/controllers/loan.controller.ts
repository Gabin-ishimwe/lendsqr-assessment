import { NextFunction, Request, Response } from "express";
import LenderService from "../services/lender.service";
import LoanService from "../services/loan.service";
import db from "../database/db";
import LoanModel from "../models/loan.model";
import TransactionModel from "../models/transaction.model";

class LoanController {
  static async createLoanApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const loan = req.body;
      const { id } = req.user;
      const offerExist = await db("lender_offer")
        .where("id", loan.lenderOfferId)
        .returning("*");
      if (offerExist.length == 0) {
        return res.status(404).json({
          message: "Lender offer doesn't exist",
        });
      }
      if (offerExist[0].status == "NOT_AVAILABLE")
        return res.status(400).json({ message: "This offer is not available" });

      const loanApplication = await LoanService.createLoanApplication(loan, id);

      res.status(201).json({
        message: "Loan application created successfull",
        loanApplication,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error occured while creating loan application",
      });
    }
  }
  static async updateLoanApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const loan = req.body;
      const { id } = req.params;
      const offerExist = await LenderService.getLenderService(
        loan.lenderOfferId
      );
      if (!offerExist) {
        return res.status(404).json({
          message: "Lender offer doesn't exist",
        });
      }
      const loanApplication = await LoanService.updateLoanApplication(
        loan,
        parseInt(id)
      );

      res.status(201).json({
        message: "Loan application updated successfull",
        loanApplication,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error occured while updating loan application",
      });
    }
  }

  static async getLoanApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const loanApplication = await LoanService.getLoanApplication(
        parseInt(id)
      );

      res.status(201).json({
        message: "Loan application",
        loanApplication,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error occured while retrieving loan application",
      });
    }
  }

  static async getAllLoanApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const loanApplication = await LoanService.getAllLoanApplication();

      res.status(201).json({
        message: "All loan Applications",
        loanApplication,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error occured while retrieving loan application",
      });
    }
  }

  static async respondeLoanApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const loan = req.data;
      const user = req.user;
      const { loanId, status } = req.body;
      if (loan.status == "APPROVED") {
        return res.status(500).json({
          message: "Loan Application is arleady approved",
        });
      }
      if (status == "REJECTED") {
        const updatedLoan = await LoanModel.query()
          .findById(loanId)
          .patch({
            status,
          })
          .returning("*");
        res.status(200).json({
          message: "Loan Rejected",
          loan: updatedLoan,
        });
      }
      if (user.account.balance_amount < loan.amount_requested) {
        return res.status(500).json({
          message:
            "You don't have sufficient funds to approve this loan and make a transaction transfer",
        });
      }
      const transactionExec = await db.transaction(async (trx) => {
        const updatedLoan = await trx("loan_application")
          .where("id", loanId)
          .update({ status })
          .returning("*");

        // transfering money to borrowers account
        const accountTransfered = await trx("account")
          .where("account_number", loan.users.account.account_number)
          .update({
            balance_amount: loan.amount_requested,
          })
          .returning("*");

        // updating lender's account after transfter
        await trx("account")
          .where("account_number", user.account.account_number)
          .update({
            balance_amount: user.account.balance_amount - loan.amount_requested,
          })
          .returning("*");

        // recording transaction
        const complexTransaction = await TransactionModel.query(trx)
          .insert({
            type: "CREDIT",
            amount: loan.amount_requested,
            account_id: accountTransfered[0].account_number,
            loan_application_id: updatedLoan[0].id,
          })
          .returning("*")
          .withGraphFetched({
            account: {
              users: true,
            },
            loan_application: true,
          });
        return {
          message: "Loan Approved and Transaction made successfully",
          transaction: complexTransaction,
        };
      });
      return res.status(200).json({ ...transactionExec });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error occured while responding to loan application",
      });
    }
  }
}

export default LoanController;
